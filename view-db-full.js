#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'survey.db');
const db = new Database(dbPath);

console.log('\n✅ SQLite 데이터베이스 상세 조회...\n');

try {
  // 모든 설문 응답 조회 (questions도 포함)
  const stmt = db.prepare(`
    SELECT id, name, affiliation, job, years, round, questions, "savedAt"
    FROM survey_response
    ORDER BY "savedAt" DESC
  `);
  const responses = stmt.all();
  
  console.log(`📊 데이터베이스의 설문 응답: ${responses.length}개\n`);
  console.log('='.repeat(80));
  
  responses.forEach((res, idx) => {
    console.log(`\n[${idx + 1}] ${res.name} (${res.job}) - ${res.round}회차`);
    console.log('-'.repeat(80));
    console.log(`ID: ${res.id}`);
    console.log(`소속: ${res.affiliation}`);
    console.log(`근속: ${res.years}년`);
    console.log(`저장일: ${res.savedAt}`);
    console.log('\n📋 설문 응답 내용:');
    
    try {
      const questions = JSON.parse(res.questions);
      console.log(JSON.stringify(questions, null, 2));
    } catch (e) {
      console.log(res.questions);
    }
    
    console.log('='.repeat(80));
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
