import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // survey_results 디렉토리 생성
    const surveyDir = path.join(process.cwd(), 'public', 'survey_results');
    if (!fs.existsSync(surveyDir)) {
      fs.mkdirSync(surveyDir, { recursive: true });
    }

    // 파일명 생성
    const now = new Date();
    const timestamp = now.toLocaleString('ko-KR').replace(/[/:\s]/g, '');
    const filename = `${data.name}_${data.job}_${timestamp}_${data.round}회차.json`;
    const filepath = path.join(surveyDir, filename);

    // JSON 파일로 저장
    const surveyResult = {
      ...data,
      savedAt: now.toISOString(),
    };

    fs.writeFileSync(filepath, JSON.stringify(surveyResult, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: '저장되었습니다.' });
  } catch (error) {
    console.error('Survey save error:', error);
    return NextResponse.json(
      { success: false, message: '저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

