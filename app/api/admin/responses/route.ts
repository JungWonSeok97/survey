import { NextRequest } from "next/server";
import { db, failure, HttpError, json, requireAdmin } from "@/lib/server";
import {
  filteredQuery,
  filters,
  legacyPeopleQuery,
  legacyPersonDetail,
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
        if (!/^[a-f0-9]{64}$/.test(id)) throw new ValidationError("참여자 식별자가 올바르지 않습니다.");
        const detail = await legacyPersonDetail(id);
        if (!detail) throw new HttpError(404, "참여자 기록이 없습니다.");
        return json({ success: true, ...detail });
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
    const { data, error, count } = await (source === "legacy" ? legacyPeopleQuery(params) : filteredQuery(params)).range(
      (page - 1) * 30,
      page * 30 - 1,
    );
    if (error) throw error;
    const rows =
      source === "legacy"
        ? (data || []).map((row) => ({
            id: row.person_id,
            participant: {
              name: row.name,
              employeeId: row.employee_id,
              affiliation: row.affiliation,
              job: row.job,
              years: String(row.years),
            },
            record_count: row.record_count,
            answer_count: row.answer_count,
            created_at: row.first_saved_at,
            last_saved_at: row.last_saved_at,
            survey_version: "legacy",
          }))
        : ((data as SurveySession[]) || []).map(summary);
    return json({ success: true, rows, total: count || 0, page });
  } catch (error) {
    return failure(error);
  }
}
