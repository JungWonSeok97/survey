import { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  cookieOptions,
  db,
  hash,
  HttpError,
  failure,
  json,
  sameOrigin,
} from "@/lib/server";
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      const { error } = await db().from("survey_admin_sessions").delete().eq("token_hash", hash(token));
      if (error) throw new HttpError(503, "로그아웃하지 못했습니다. 다시 시도해주세요.");
    }
    const response = json({ success: true });
    response.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return failure(error);
  }
}
