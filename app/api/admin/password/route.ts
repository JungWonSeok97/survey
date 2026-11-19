import { NextRequest } from "next/server";
import { ADMIN_COOKIE, body, cookieOptions, db, failure, hash, HttpError, json, limit, requireAdmin } from "@/lib/server";
import { hashPassword, verifyPassword } from "@/lib/admin-password";
import { onlyKeys, ValidationError } from "@/lib/survey-schema";
export async function POST(request: NextRequest) {
  try {
    const input = await body(request);
    const admin = await requireAdmin(request);
    onlyKeys(input, ["currentPassword", "newPassword"]);
    if (typeof input.currentPassword !== "string" || input.currentPassword.length < 1 || input.currentPassword.length > 256 ||
        typeof input.newPassword !== "string" || input.newPassword.length < 12 || input.newPassword.length > 256 ||
        input.currentPassword === input.newPassword)
      throw new ValidationError("현재 비밀번호와 다른 12~256자의 새 비밀번호를 입력해주세요.");
    await limit(request, "admin-password", 10, 900, admin.id);
    const { data, error } = await db().from("survey_admins").select("password_hash").eq("id", admin.id).single();
    if (error) throw new HttpError(503, "계정 정보를 확인하지 못했습니다.");
    if (!await verifyPassword(input.currentPassword, data.password_hash)) throw new HttpError(401, "현재 비밀번호가 올바르지 않습니다.");
    const changed = await db().rpc("change_survey_admin_password", {
      p_admin_id: admin.id, p_token_hash: hash(request.cookies.get(ADMIN_COOKIE)!.value),
      p_old_hash: data.password_hash, p_new_hash: await hashPassword(input.newPassword),
    });
    if (changed.error) throw new HttpError(503, "비밀번호를 변경하지 못했습니다.");
    if (!changed.data) throw new HttpError(401, "로그인 상태가 변경되었습니다. 다시 로그인해주세요.");
    const response = json({ success: true });
    response.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) { return failure(error); }
}
