import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    message: "✅ 서버가 정상 작동 중입니다"
  });
}