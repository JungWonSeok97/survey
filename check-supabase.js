#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('\n✅ Supabase 데이터 조회...\n');

  try {
    // 모든 데이터 조회
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .order('saved_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase 오류:', error.message);
      return;
    }

    console.log(`📊 총 ${data.length}개의 응답\n`);

    // 날짜별로 그룹화
    const byDate = {};
    data.forEach(item => {
      const date = new Date(item.saved_at).toLocaleDateString('ko-KR');
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(item);
    });

    console.log('📅 날짜별 응답 수:');
    Object.keys(byDate)
      .sort()
      .reverse()
      .forEach(date => {
        console.log(`  ${date}: ${byDate[date].length}개`);
      });

    console.log('\n📋 최근 10개 응답:');
    data.slice(0, 10).forEach((item, idx) => {
      const date = new Date(item.saved_at).toLocaleString('ko-KR');
      console.log(`  [${idx + 1}] ${item.name} (${item.job}) - ${item.round}회차 (${date})`);
    });

    // 11월 23일 이전 데이터 확인
    const nov23 = new Date('2025-11-23T00:00:00');
    const beforeNov23 = data.filter(item => new Date(item.saved_at) < nov23);
    console.log(`\n🔍 11월 23일 이전 데이터: ${beforeNov23.length}개`);

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

checkData();
