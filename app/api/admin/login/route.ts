import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { ADMIN_COOKIE, body, cookieOptions, db, failure, hash, HttpError, json, limit } from "@/lib/server";
import { DUMMY_HASH, verifyPassword } from "@/lib/admin-password";
import { onlyKeys, ValidationError } from "@/lib/survey-schema";
export async function POST(request: NextRequest) {
  const started = Date.now();
  try {
    const input = await body(request);
    onlyKeys(input, ["username", "password"]);
    if (typeof input.username !== "string" || !/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(input.username.trim().toLowerCase()) ||
        typeof input.password !== "string" || input.password.length < 1 || input.password.length > 256)
      throw new ValidationError("아이디와 비밀번호를 확인해주세요.");
    const username = input.username.trim().toLowerCase();
    await limit(request, "admin-login", 15, 900);
    await limit(request, "admin-account-login", 30, 900, username);
    const { data: admin, error } = await db().from("survey_admins")
      .select("id,password_hash,is_active").eq("username", username).maybeSingle();
    if (error) throw new HttpError(503, "관리자 계정 연결을 확인해주세요.");
    const valid = await verifyPassword(input.password, admin?.password_hash || DUMMY_HASH);
    if (!valid || !admin?.is_active) throw new HttpError(401, "아이디 또는 비밀번호가 올바르지 않습니다.");
    const token = randomBytes(32).toString("hex");
    const issued = await db().rpc("issue_survey_admin_session", {
      p_admin_id: admin.id, p_password_hash: admin.password_hash, p_token_hash: hash(token),
    });
    if (issued.error) throw new HttpError(503, "로그인을 완료하지 못했습니다. 다시 시도해주세요.");
    if (!issued.data) throw new HttpError(401, "계정이 변경되었습니다. 다시 로그인해주세요.");
    const response = json({ success: true });
    response.cookies.set(ADMIN_COOKIE, token, { ...cookieOptions, maxAge: 3600 });
    return response;
  } catch (error) { return failure(error, "admin.login.post", started); }
}
