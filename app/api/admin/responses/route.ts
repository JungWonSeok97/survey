import { NextRequest } from "next/server";
import { db, failure, HttpError, json, requireAdmin } from "@/lib/server";
import {
  filteredQuery,
  filters,
  legacyParticipant,
  summary,
} from "@/lib/admin-data";
import { validateUUID, ValidationError } from "@/lib/survey-schema";
import type { SurveySession } from "@/lib/survey-schema";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const params = request.nextUrl.searchParams,
      { source } = filters(params),
      id = params.get("id");
    if (id) {
      if (source === "legacy") {
        if (!/^[\w-]{1,60}$/.test(id))
          throw new ValidationError("응답 식별자가 올바르지 않습니다.");
        const { data, error } = await db()
          .from("survey_responses")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new HttpError(404, "응답이 없습니다.");
        return json({
          success: true,
          participant: legacyParticipant(data),
          rounds: [{ ...data, session_id: null }],
          source,
        });
      }
      validateUUID(id);
      const [session, rounds] = await Promise.all([
        db().from("survey_sessions").select("*").eq("id", id).maybeSingle(),
        db()
          .from("survey_rounds")
          .select("id,session_id,round,questions,saved_at")
          .eq("session_id", id)
          .order("round"),
      ]);
      if (session.error || rounds.error) throw session.error || rounds.error;
      if (!session.data) throw new HttpError(404, "설문이 없습니다.");
      return json({
        success: true,
        participant: session.data.participant,
        rounds: rounds.data,
        source,
      });
    }
    const page = Number(params.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      throw new ValidationError("페이지가 올바르지 않습니다.");
    const { data, error, count } = await filteredQuery(params).range(
      (page - 1) * 30,
      page * 30 - 1,
    );
    if (
      error &&
      source === "legacy" &&
      ["PGRST205", "42P01"].includes(error.code)
    )
      return json({ success: true, rows: [], total: 0, page });
    if (error) throw error;
    const rows =
      source === "legacy"
        ? (data || []).map((row) => ({
            id: row.id,
            participant: {
              name: row.name,
              employeeId: row.employee_id,
              affiliation: row.affiliation,
              job: row.job,
              years: String(row.years),
            },
            round: row.round,
            created_at: row.saved_at,
            survey_version: "legacy",
          }))
        : ((data as SurveySession[]) || []).map(summary);
    return json({ success: true, rows, total: count || 0, page });
  } catch (error) {
    return failure(error);
  }
}
