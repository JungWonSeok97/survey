const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('✅ Prisma 연결 테스트...\n');
    
    // 모든 설문 응답 조회
    const responses = await prisma.surveyResponse.findMany();
    
    console.log(`📊 데이터베이스의 설문 응답: ${responses.length}개\n`);
    
    if (responses.length > 0) {
      responses.forEach((res, idx) => {
        console.log(`[${idx + 1}] ${res.name} (${res.job}) - ${res.round}회차`);
        console.log(`    소속: ${res.affiliation}`);
        console.log(`    근속: ${res.years}년`);
        console.log(`    저장일: ${res.savedAt}\n`);
      });
    } else {
      console.log('⚠️  데이터베이스에 저장된 설문이 없습니다.');
      console.log('   → 설문을 완료해서 다시 시도하세요!\n');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.log('\n💡 해결 방법:');
    console.log('1. PostgreSQL이 실행 중인지 확인하세요');
    console.log('2. npx prisma migrate reset 을 실행하세요');
    console.log('3. 설문을 다시 완료해보세요\n');
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
