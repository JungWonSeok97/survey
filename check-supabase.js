#!/usr/bin/env node
// Run: node --env-file=.env.local check-supabase.js
async function check() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Supabase 서버 환경변수를 설정해주세요.'); process.exitCode = 1; return; }
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const table of ['survey_sessions', 'survey_rounds', 'survey_responses']) {
    const { count, error } = await client.from(table).select('id', { count: 'exact', head: true });
    if (error) { console.error(`${table}: 조회 실패. DB 구성과 서버 권한을 확인해주세요.`); process.exitCode = 1; }
    else console.info(`${table}: ${count}건`);
  }
}
check().catch(() => { console.error('연결을 확인하지 못했습니다.'); process.exitCode = 1; });
