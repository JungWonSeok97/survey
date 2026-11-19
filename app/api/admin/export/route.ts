import { NextRequest } from "next/server";
import { db, failure, HttpError, requireAdmin } from "@/lib/server";
import {
  csvRow,
  filteredQuery,
  filters,
  legacyParticipant,
} from "@/lib/admin-data";
import { FIELD_GROUPS } from "@/lib/survey-schema";
import type { Participant } from "@/lib/survey-schema";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const params = request.nextUrl.searchParams,
      { source } = filters(params),
      kind = params.get("kind") || "answers";
    if (!["answers", "participants"].includes(kind))
      throw new HttpError(400, "내보내기 형식이 올바르지 않습니다.");
    // Validate the first query before opening the stream so schema/config errors are HTTP errors.
    const cutoff = new Date().toISOString();
    const snapshot = () =>
      filteredQuery(params).lte(
        source === "legacy" ? "saved_at" : "created_at",
        cutoff,
      );
    const first = await snapshot().range(0, 199);
    if (first.error) throw first.error;
    const encoder = new TextEncoder();
    const fields = FIELD_GROUPS.flatMap((g) => [...g.fields]);
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (values: unknown[]) =>
          controller.enqueue(encoder.encode(csvRow(values)));
        try {
          controller.enqueue(encoder.encode("\uFEFF"));
          emit(
            kind === "participants"
              ? [
                  "설문ID",
                  "설문버전",
                  ...fields.map((f) => f.label),
                  "고유 완료회차",
                  "총회차",
                  "상태",
                  "생성일시",
                ]
              : [
                  "설문ID",
                  "설문버전",
                  "회차",
                  "PSF",
                  "응답",
                  "응답코드",
                  "조건_JSON",
                  "조건코드_JSON",
                  "저장일시",
                ],
          );
          let offset = 0,
            rows = first.data || [];
          while (rows.length) {
            for (const row of rows) {
              const participant: Participant =
                source === "legacy" ? legacyParticipant(row) : row.participant;
              if (kind === "participants") {
                emit([
                  source === "legacy" ? `legacy-record:${row.id}` : row.id,
                  source === "legacy" ? "legacy" : row.survey_version,
                  ...fields.map((f) => participant[f.key]),
                  source === "legacy" ? "" : row.completed_rounds,
                  source === "legacy" ? "" : row.total_rounds,
                  source === "legacy"
                    ? "기존 회차 기록"
                    : row.abandoned_at
                      ? "중단"
                      : row.completed_at
                        ? "완료"
                        : "진행 중",
                  row.created_at || row.saved_at,
                ]);
              } else {
                let rounds = [row];
                if (source !== "legacy") {
                  const result = await db()
                    .from("survey_rounds")
                    .select("round,questions,saved_at")
                    .eq("session_id", row.id)
                    .lte("saved_at", cutoff)
                    .order("round");
                  if (result.error) throw result.error;
                  rounds = result.data || [];
                }
                for (const round of rounds)
                  for (const question of round.questions || []) {
                    emit([
                      source === "legacy" ? `legacy-record:${row.id}` : row.id,
                      source === "legacy" ? "legacy" : row.survey_version,
                      round.round,
                      question.id,
                      question.answer,
                      question.answerCode || "",
                      question.conditions || {},
                      question.conditionCodes || {},
                      round.saved_at,
                    ]);
                  }
              }
            }
            if (rows.length < 200) break;
            offset += 200;
            const next = await snapshot().range(offset, offset + 199);
            if (next.error) throw next.error;
            rows = next.data || [];
          }
          controller.close();
        } catch {
          controller.error(new Error("Export interrupted"));
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="survey-${source}-${kind}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
