import { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  cookieOptions,
  db,
  failure,
  json,
  sameOrigin,
} from "@/lib/server";
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    if (token) await db().auth.admin.signOut(token, "local");
    const response = json({ success: true });
    response.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    return failure(error);
  }
}
