import { NextRequest } from "next/server";
import { logServerError, failure, HttpError, requireAdmin } from "@/lib/server";
import {
  csvRow,
  filteredQuery,
  filters,
  legacyParticipant,
  legacyPeopleQuery,
} from "@/lib/admin-data";
import { FIELD_GROUPS } from "@/lib/survey-schema";
import type { Participant } from "@/lib/survey-schema";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const started = Date.now();
  try {
    await requireAdmin(request);
    const params = request.nextUrl.searchParams,
      { source } = filters(params),
      kind = params.get("kind") || "answers";
    if (!["answers", "participants"].includes(kind))
      throw new HttpError(400, "내보내기 형식이 올바르지 않습니다.");
    // Validate the first query before opening the stream so schema/config errors are HTTP errors.
    const cutoff = new Date().toISOString();
    const peopleExport = source === "legacy" && kind === "participants";
    const includeRounds = source === "v2" && kind === "answers";
    const snapshot = () => {
      if (peopleExport) return legacyPeopleQuery(params, true).lte("last_saved_at", cutoff);
      const query = filteredQuery(params, includeRounds, false)
        .lte(source === "legacy" ? "saved_at" : "created_at", cutoff);
      if (includeRounds) return query.lte("survey_rounds.saved_at", cutoff)
        .order("round", { referencedTable: "survey_rounds" });
      return query;
    };
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
                  source === "legacy" ? "참여자ID" : "설문ID",
                  "설문버전",
                  ...fields.map((f) => f.label),
                  source === "legacy" ? "저장 회차 기록 수" : "고유 완료회차",
                  source === "legacy" ? "PSF 응답 수" : "총회차",
                  "상태",
                  "생성일시",
                ]
              : [
                  source === "legacy" ? "참여자ID" : "설문ID",
                  "설문버전",
                  "회차",
                  "PSF",
                  "응답",
                  "응답코드",
                  "조건_JSON",
                  "조건코드_JSON",
                  "저장일시",
                  "원본 기록ID",
                ],
          );
          let offset = 0,
            rows = first.data || [];
          while (rows.length) {
            for (const row of rows) {
              const participant: Participant =
                source === "legacy" ? legacyParticipant(peopleExport ? row.profile : row) : row.participant;
              if (kind === "participants") {
                emit([
                  source === "legacy" ? `legacy-person:${row.person_id}` : row.id,
                  source === "legacy" ? "legacy" : row.survey_version,
                  ...fields.map((f) => participant[f.key]),
                  source === "legacy" ? row.record_count : row.completed_rounds,
                  source === "legacy" ? row.answer_count : row.total_rounds,
                  source === "legacy"
                    ? "기존 참여자 기록"
                    : row.abandoned_at
                      ? "중단"
                      : row.completed_at
                        ? "완료"
                        : "진행 중",
                  row.first_saved_at || row.created_at || row.saved_at,
                ]);
              } else {
                const rounds = includeRounds ? row.survey_rounds : [row];
                for (const round of rounds)
                  for (const question of round.questions || []) {
                    emit([
                      source === "legacy" ? `legacy-person:${row.person_id}` : row.id,
                      source === "legacy" ? "legacy" : row.survey_version,
                      round.round,
                      question.id,
                      question.answer,
                      question.answerCode || "",
                      question.conditions || {},
                      question.conditionCodes || {},
                      round.saved_at,
                      source === "legacy" ? row.id : "",
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
        } catch (error) {
          logServerError(error, "admin.export.stream", started);
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
    return failure(error, "admin.export.get", started);
  }
}
