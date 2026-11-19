import { NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { body, db, failure, HttpError, json, limit, owner } from "@/lib/server";
import {
  generateScenarios,
  onlyKeys,
  SURVEY_VERSION,
  validateAnswers,
  validateRound,
  validateUUID,
} from "@/lib/survey-schema";

export async function POST(request: NextRequest) {
  try {
    const input = await body(request);
    onlyKeys(input, ["sessionId", "round", "answers"]);
    const id = validateUUID(input.sessionId),
      round = validateRound(input.round),
      access = owner(request);
    if (!access)
      throw new HttpError(
        401,
        "설문 연결이 만료되었습니다. 같은 브라우저에서 다시 접속해주세요.",
      );
    await limit(request, "save-round", 120, 60, access.hash);
    const client = db();
    const { data: session, error: lookupError } = await client
      .from("survey_sessions")
      .select("*")
      .eq("id", id)
      .eq("owner_hash", access.hash)
      .is("abandoned_at", null)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!session)
      throw new HttpError(404, "진행 중인 설문을 찾을 수 없습니다.");
    if (session.survey_version !== SURVEY_VERSION)
      throw new HttpError(
        409,
        "설문 버전이 변경되었습니다. 관리자에게 문의해주세요. 기존 응답은 보관되어 있습니다.",
      );
    const answers = validateAnswers(input.answers, session.question_ids);
    const { data, error } = await client.rpc("save_survey_round", {
      p_session_id: id,
      p_owner_hash: access.hash,
      p_round: round,
      p_answers: answers,
      p_next_questions: generateScenarios(
        session.question_ids,
        () => randomInt(0, 0x1000000) / 0x1000000,
      ),
    });
    if (error) {
      if (/ANSWER_CONFLICT|ROUND_CONFLICT/.test(error.message))
        throw new HttpError(
          409,
          "이미 저장된 응답이나 진행 회차가 다릅니다. 저장 상태를 다시 불러와주세요.",
        );
      if (/SESSION_NOT_FOUND/.test(error.message))
        throw new HttpError(404, "진행 중인 설문을 찾을 수 없습니다.");
      throw error;
    }
    return json({ success: true, ...data });
  } catch (error) {
    return failure(error);
  }
}
