#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'survey.db');
const db = new Database(dbPath);

console.log('\n✅ SQLite 데이터베이스 연결 테스트...\n');

try {
  // 모든 설문 응답 조회
  const stmt = db.prepare(`
    SELECT id, name, affiliation, job, years, round, "savedAt"
    FROM survey_response
    ORDER BY "savedAt" DESC
  `);
  const responses = stmt.all();
  
  console.log(`📊 데이터베이스의 설문 응답: ${responses.length}개\n`);
  
  responses.forEach((res, idx) => {
    console.log(`[${idx + 1}] ${res.name} (${res.job}) - ${res.round}회차`);
    console.log(`    소속: ${res.affiliation}`);
    console.log(`    근속: ${res.years}년`);
    console.log(`    저장일: ${res.savedAt}\n`);
  });

  if (responses.length === 0) {
    console.log('⚠️  데이터베이스에 저장된 설문이 없습니다.');
    console.log('   → 설문을 완료해서 다시 시도하세요!\n');
  }

} catch (error) {
  console.error('❌ 오류:', error.message);
} finally {
  db.close();
}
