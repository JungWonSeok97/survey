import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ValidationError, record } from "./survey-schema";

export const OWNER_COOKIE = "rail_survey_owner";
export const ADMIN_COOKIE = "rail_survey_admin";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function db() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new HttpError(
      503,
      "설문 서버 설정이 준비되지 않았습니다. 관리자에게 문의해주세요.",
    );
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function owner(request: NextRequest, create = false) {
  const cookie = request.cookies.get(OWNER_COOKIE)?.value;
  const token =
    cookie && /^[a-f0-9]{64}$/.test(cookie)
      ? cookie
      : create
        ? randomBytes(32).toString("hex")
        : null;
  return token ? { token, hash: hash(token) } : null;
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Cookie-bearing write requests must come from the application origin.
  const expected = process.env.APP_ORIGIN || request.nextUrl.origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(
      403,
      "요청 출처를 확인할 수 없습니다. 페이지를 새로고침해주세요.",
    );
}
export async function body(request: NextRequest) {
  sameOrigin(request);
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(415, "JSON 형식으로 요청해주세요.");
  if (Number(request.headers.get("content-length") || 0) > 16384)
    throw new HttpError(413, "입력 내용이 너무 깁니다.");
  const text = await request.text();
  if (Buffer.byteLength(text) > 16384)
    throw new HttpError(413, "입력 내용이 너무 깁니다.");
  try {
    return record(JSON.parse(text));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("요청 내용을 읽을 수 없습니다.");
  }
}
export function failure(error: unknown) {
  if (error instanceof ValidationError)
    return json(
      { success: false, error: error.message, field: error.field },
      400,
    );
  if (error instanceof HttpError)
    return json({ success: false, error: error.message }, error.status);
  // Do not log participant records, auth tokens, database details, or error stacks.
  console.error("survey_request_failed");
  return json(
    {
      success: false,
      error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.",
    },
    500,
  );
}
export async function limit(
  request: NextRequest,
  scope: string,
  count: number,
  seconds: number,
  identity?: string,
) {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  const { data, error } = await db().rpc("consume_survey_limit", {
    p_bucket: `${scope}:${hash(identity || ip)}`,
    p_limit: count,
    p_seconds: seconds,
  });
  if (error)
    throw new HttpError(
      503,
      "설문 DB 설정을 확인해야 합니다. 관리자에게 문의해주세요.",
    );
  if (!data)
    throw new HttpError(429, "요청이 많습니다. 잠시 후 다시 시도해주세요.");
}
export async function requireAdmin(request: NextRequest) {
  return verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
}
export async function verifyAdminToken(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, "관리자 로그인이 필요합니다.");
  const { data: session, error } = await db().from("survey_admin_sessions")
    .select("admin_id").eq("token_hash", hash(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new HttpError(503, "관리자 로그인 상태를 확인하지 못했습니다.");
  if (!session) throw new HttpError(401, "로그인 시간이 만료되었습니다. 다시 로그인해주세요.");
  const account = await db().from("survey_admins").select("id,username,is_active").eq("id", session.admin_id).maybeSingle();
  if (account.error) throw new HttpError(503, "관리자 계정을 확인하지 못했습니다.");
  if (!account.data?.is_active) throw new HttpError(401, "사용할 수 없는 관리자 계정입니다.");
  return account.data;
}
