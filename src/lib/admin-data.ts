import "server-only";
import { db } from "./server";
import { ValidationError } from "./survey-schema";
import type { Participant, SurveySession } from "./survey-schema";

export type LegacyRecord = Record<string, unknown> & {
  id: string | number;
  questions?: Record<string, unknown>[];
};
export const LEGACY_FIELDS: Record<string, string> = {
  name: "name",
  affiliation: "affiliation",
  employeeId: "employee_id",
  job: "job",
  years: "years",
  position: "position",
  department: "department",
  gender: "gender",
  dateOfBirth: "date_of_birth",
  officePhone: "office_phone",
  companyEmail: "company_email",
  railroadCertification: "railroad_certification",
  jobEducation: "job_education",
  healthCheckDate: "health_check_date",
  bodyTemperature: "body_temperature",
  systolicBP: "systolic_bp",
  diastolicBP: "diastolic_bp",
  pulse: "pulse",
  workType: "work_type",
  workTime: "work_time",
  employeeCardNumber: "employee_card_number",
};
export function legacyParticipant(row: LegacyRecord): Participant {
  return Object.fromEntries(
    Object.entries(LEGACY_FIELDS).map(([key, field]) => [
      key,
      String(row[field] ?? ""),
    ]),
  );
}
export function filters(params: URLSearchParams) {
  const source = params.get("source") || "legacy",
    years = params.get("years") || "all",
    search = (params.get("search") || "").trim();
  if (
    !["v2", "legacy"].includes(source) ||
    !["all", "under10", "10to20", "20to30", "over30"].includes(years)
  )
    throw new ValidationError("조회 조건이 올바르지 않습니다.");
  if (search && !/^[\p{L}\p{N}\s_-]{1,60}$/u.test(search))
    throw new ValidationError(
      "검색어는 이름·사번의 문자와 숫자로 입력해주세요.",
    );
  return { source, years, search };
}
export function filteredQuery(params: URLSearchParams) {
  const { source, years, search } = filters(params);
  let query = db()
    .from(source === "legacy" ? "survey_legacy_answers" : "survey_sessions")
    .select("*", { count: "exact" });
  const yearColumn = source === "legacy" ? "person_years_numeric" : "years";
  if (years === "under10") query = query.lt(yearColumn, 10);
  if (years === "10to20") query = query.gte(yearColumn, 10).lt(yearColumn, 20);
  if (years === "20to30") query = query.gte(yearColumn, 20).lt(yearColumn, 30);
  if (years === "over30") query = query.gte(yearColumn, 30);
  if (search)
    query = query.or(
      source === "legacy"
        ? `name.ilike.%${search}%,employee_id.ilike.%${search}%`
        : `participant->>name.ilike.%${search}%,participant->>employeeId.ilike.%${search}%`,
    );
  return query
    .order(source === "legacy" ? "saved_at" : "created_at", {
      ascending: false,
    })
    .order("id", { ascending: false });
}
export function summary(session: SurveySession) {
  return {
    ...session,
    participant: Object.fromEntries(
      ["name", "employeeId", "affiliation", "job", "years"].map((key) => [
        key,
        session.participant[key] || "",
      ]),
    ),
    pending_questions: undefined,
    owner_hash: undefined,
  };
}
export function csvCell(value: unknown) {
  let text =
    typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export const csvRow = (values: unknown[]) =>
  values.map(csvCell).join(",") + "\r\n";

export function legacyPeopleQuery(params: URLSearchParams, withProfile = false) {
  const { years, search } = filters(params);
  let query = db().from("survey_legacy_people").select(
    "person_id,name,employee_id,affiliation,job,years,record_count,answer_count,first_saved_at,last_saved_at" + (withProfile ? ",profile" : ""),
    { count: "exact" },
  );
  if (years === "under10") query = query.lt("years_numeric", 10);
  if (years === "10to20") query = query.gte("years_numeric", 10).lt("years_numeric", 20);
  if (years === "20to30") query = query.gte("years_numeric", 20).lt("years_numeric", 30);
  if (years === "over30") query = query.gte("years_numeric", 30);
  if (search) query = query.or(`name.ilike.%${search}%,employee_id.ilike.%${search}%`);
  return query.order("last_saved_at", { ascending: false, nullsFirst: false }).order("person_id");
}

export async function legacyPersonDetail(personId: string) {
  const person = await db().from("survey_legacy_people").select("profile,record_count,answer_count")
    .eq("person_id", personId).maybeSingle();
  if (person.error) throw person.error;
  if (!person.data) return null;
  const rounds: Record<string, unknown>[] = [];
  // Paginate so long histories cannot be cut off by PostgREST's row limit.
  for (let offset = 0; ; offset += 200) {
    const result = await db().from("survey_legacy_records").select("id,round,questions,saved_at")
      .eq("person_id", personId).order("saved_at", { ascending: true, nullsFirst: false }).order("id")
      .range(offset, offset + 199);
    if (result.error) throw result.error;
    rounds.push(...(result.data || []));
    if ((result.data || []).length < 200) break;
  }
  return { participant: legacyParticipant(person.data.profile), rounds, source: "legacy", personId,
    recordCount: person.data.record_count, answerCount: person.data.answer_count };
}
