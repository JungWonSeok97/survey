import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'survey.db');
const db = new Database(dbPath);

interface SurveyResponse {
  id: string;
  name: string;
  affiliation: string;
  job: string;
  years: number;
  round: number;
  questions: string;
  savedAt: string;
}

function main() {
  try {
    // 1. 모든 설문 응답 조회
    console.log('\n📊 === 모든 설문 응답 ===');
    const allResponses = db.prepare(`
      SELECT * FROM survey_response
      ORDER BY "savedAt" DESC
    `).all() as SurveyResponse[];

    if (allResponses.length === 0) {
      console.log('저장된 설문 응답이 없습니다.');
    } else {
      console.log(`총 ${allResponses.length}개의 설문 응답이 있습니다.\n`);
      allResponses.forEach((response, index) => {
        console.log(`${index + 1}. ${response.name} (${response.job}) - ${response.round}회차`);
        console.log(`   소속: ${response.affiliation}, 근속: ${response.years}년`);
        console.log(`   저장일시: ${new Date(response.savedAt).toLocaleString('ko-KR')}\n`);
      });
    }

    // 2. 특정 사람의 설문 조회
    if (allResponses.length > 0) {
      const firstName = allResponses[0].name;
      console.log(`\n👤 === ${firstName}님의 모든 설문 ===`);
      const userResponses = db.prepare(`
        SELECT * FROM survey_response
        WHERE name = ?
        ORDER BY round ASC
      `).all(firstName) as SurveyResponse[];

      userResponses.forEach((response) => {
        console.log(`\n[${response.round}회차]`);
        try {
          const questions = JSON.parse(response.questions);
          if (Array.isArray(questions)) {
            questions.forEach((q: any) => {
              console.log(`  문항 ${q.number || '?'}: ${q.answer || '답변없음'}`);
            });
          }
        } catch (e) {
          console.log(`  데이터 파싱 오류`);
        }
      });
    }

    // 3. 통계
    console.log('\n📈 === 설문 통계 ===');
    const stats = db.prepare(`
      SELECT name, job, COUNT(*) as count
      FROM survey_response
      GROUP BY name, job
    `).all() as Array<{ name: string; job: string; count: number }>;

    stats.forEach((stat) => {
      console.log(`${stat.name} (${stat.job}): ${stat.count}회차 완료`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    db.close();
  }
}

main();
