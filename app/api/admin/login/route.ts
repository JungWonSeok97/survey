import { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  body,
  cookieOptions,
  db,
  failure,
  HttpError,
  json,
  limit,
} from "@/lib/server";
import { onlyKeys, ValidationError } from "@/lib/survey-schema";
export async function POST(request: NextRequest) {
  try {
    const input = await body(request);
    onlyKeys(input, ["email", "password"]);
    if (
      typeof input.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
      input.email.length > 254 ||
      typeof input.password !== "string" ||
      input.password.length < 1 ||
      input.password.length > 256
    )
      throw new ValidationError("이메일과 비밀번호를 확인해주세요.");
    await limit(request, "admin-login", 15, 900);
    const { data, error } = await db().auth.signInWithPassword({
      email: input.email.trim(),
      password: input.password,
    });
    if (error || !data.session || data.user.app_metadata?.survey_admin !== true)
      throw new HttpError(
        401,
        "이메일·비밀번호 또는 관리자 권한을 확인해주세요.",
      );
    const response = json({ success: true });
    response.cookies.set(ADMIN_COOKIE, data.session.access_token, {
      ...cookieOptions,
      maxAge: Math.min(data.session.expires_in, 3600),
    });
    return response;
  } catch (error) {
    return failure(error);
  }
}
