import { NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import {
  body,
  cookieOptions,
  db,
  failure,
  HttpError,
  json,
  limit,
  owner,
  OWNER_COOKIE,
  participantSession,
} from "@/lib/server";
import {
  generateScenarios,
  onlyKeys,
  SURVEY_VERSION,
  validateParticipant,
  validateQuestionIds,
  validateUUID,
} from "@/lib/survey-schema";

export async function GET(request: NextRequest) {
  const started = Date.now();
  try {
    const access = owner(request);
    if (!access) {
      const fresh = owner(request, true)!;
      const response = json({ success: true, session: null });
      response.cookies.set(OWNER_COOKIE, fresh.token, {
        ...cookieOptions,
        maxAge: 30 * 86400,
      });
      return response;
    }
    let query = db()
      .from("survey_sessions")
      .select("*")
      .eq("owner_hash", access.hash)
      .is("abandoned_at", null);
    const id = request.nextUrl.searchParams.get("id"),
      ids = request.nextUrl.searchParams.get("ids");
    if (id) query = query.eq("id", validateUUID(id));
    if (ids)
      query = query.eq(
        "question_ids",
        `{${validateQuestionIds(ids.split(",").map(Number)).join(",")}}`,
      );
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error)
      throw new HttpError(
        503,
        "진행 내용을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", error,
      );
    return json({ success: true, session: participantSession(data) });
  } catch (error) {
    return failure(error, "survey.session.get", started);
  }
}
export async function POST(request: NextRequest) {
  const started = Date.now();
  try {
    const input = await body(request);
    onlyKeys(input, ["participant", "questionIds"]);
    const participant = validateParticipant(input.participant),
      ids = validateQuestionIds(input.questionIds);
    // Permit shared company networks while still limiting bulk anonymous creation.
    await limit(request, "create-session", 300, 3600);
    const access = owner(request);
    if (!access)
      throw new HttpError(
        401,
        "설문 연결을 준비해야 합니다. 페이지를 새로고침해주세요.",
      );
    const client = db();
    const active = () =>
      client
        .from("survey_sessions")
        .select("*")
        .eq("owner_hash", access.hash)
        .eq("question_ids", `{${ids.join(",")}}`)
        .eq("survey_version", SURVEY_VERSION)
        .is("completed_at", null)
        .is("abandoned_at", null)
        .maybeSingle();
    const existing = await active();
    if (existing.error) throw existing.error;
    let session = existing.data;
    if (!session) {
      const result = await client
        .from("survey_sessions")
        .insert({
          owner_hash: access.hash,
          survey_version: SURVEY_VERSION,
          question_ids: ids,
          participant,
          pending_questions: generateScenarios(
            ids,
            () => randomInt(0, 0x1000000) / 0x1000000,
          ),
        })
        .select("*")
        .single();
      if (result.error?.code === "23505") {
        const concurrent = await active();
        if (concurrent.error || !concurrent.data)
          throw concurrent.error || new Error("create conflict");
        session = concurrent.data;
      } else if (result.error) throw result.error;
      else session = result.data;
    }
    if (Object.entries(participant).some(([key, value]) => session.participant[key] !== value))
      throw new HttpError(409, "이 브라우저에서 다른 참여자가 설문 중입니다. 진행 상태를 다시 불러온 뒤 연결을 해제해주세요.");
    const response = json({ success: true, session: participantSession(session) });
    response.cookies.set(OWNER_COOKIE, access.token, {
      ...cookieOptions,
      maxAge: 30 * 86400,
    });
    return response;
  } catch (error) {
    return failure(error, "survey.session.post", started);
  }
}
export async function DELETE(request: NextRequest) {
  const started = Date.now();
  try {
    const input = await body(request);
    onlyKeys(input, ["sessionId", "disconnect"]);
    if (input.disconnect !== undefined && typeof input.disconnect !== "boolean")
      throw new HttpError(400, "연결 해제 요청을 확인해주세요.");
    const id = validateUUID(input.sessionId),
      access = owner(request);
    if (!access) throw new HttpError(401, "설문 연결이 만료되었습니다.");
    const now = new Date().toISOString();
    let update = db()
      .from("survey_sessions")
      .update({
        abandoned_at: now,
        updated_at: now,
      })
      .eq("owner_hash", access.hash)
      .is("completed_at", null)
      .is("abandoned_at", null);
    if (!input.disconnect) update = update.eq("id", id);
    const { error } = await update;
    if (error) throw error;
    const response = json({ success: true });
    if (input.disconnect) response.cookies.set(OWNER_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return failure(error, "survey.session.delete", started);
  }
}
