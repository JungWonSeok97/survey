-- Apply before the v2 application deployment. Existing response rows are preserved.
begin;

create table if not exists public.survey_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null check (length(owner_hash) = 64),
  survey_version text not null,
  question_ids integer[] not null check (cardinality(question_ids) = 2 and question_ids[1] >= 1 and question_ids[2] <= 8 and question_ids[1] < question_ids[2]),
  participant jsonb not null check (jsonb_typeof(participant) = 'object'),
  years integer generated always as ((participant->>'years')::integer) stored check (years between 0 and 80),
  total_rounds integer not null default 30 check (total_rounds = 30),
  completed_rounds integer not null default 0 check (completed_rounds between 0 and 30),
  pending_questions jsonb not null check (jsonb_typeof(pending_questions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz
);
create unique index if not exists survey_one_active_session
  on public.survey_sessions(owner_hash, question_ids, survey_version)
  where completed_at is null and abandoned_at is null;
create index if not exists survey_session_owner on public.survey_sessions(owner_hash, created_at desc);

create table if not exists public.survey_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.survey_sessions(id),
  round integer not null check (round between 1 and 30),
  answers jsonb not null check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 2),
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 2),
  saved_at timestamptz not null default now(),
  unique(session_id, round)
);
create index if not exists survey_round_saved on public.survey_rounds(saved_at, id);

create table if not exists public.survey_rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  hits integer not null check (hits > 0)
);

alter table public.survey_sessions enable row level security;
alter table public.survey_rounds enable row level security;
alter table public.survey_rate_limits enable row level security;
revoke all on public.survey_sessions, public.survey_rounds, public.survey_rate_limits from public, anon, authenticated;
grant all on public.survey_sessions, public.survey_rounds, public.survey_rate_limits to service_role;
-- No anonymous/browser SELECT policy: all access goes through the authenticated server.
do $$ begin
  if to_regclass('public.survey_responses') is not null then
    execute 'alter table public.survey_responses enable row level security';
    execute 'revoke all on public.survey_responses from public, anon, authenticated';
    execute 'grant select on public.survey_responses to service_role';
  end if;
end $$;

create or replace function public.consume_survey_limit(p_bucket text, p_limit integer, p_seconds integer)
returns boolean language plpgsql set search_path = public, pg_temp as $$
declare v_hits integer;
begin
  if p_limit < 1 or p_seconds < 1 or p_seconds > 86400 then raise exception 'INVALID_LIMIT'; end if;
  insert into public.survey_rate_limits as r(bucket, window_start, hits)
    values(p_bucket, clock_timestamp(), 1)
    on conflict(bucket) do update set
      hits = case when r.window_start < clock_timestamp() - make_interval(secs => p_seconds) then 1 else least(r.hits + 1, p_limit + 1) end,
      window_start = case when r.window_start < clock_timestamp() - make_interval(secs => p_seconds) then clock_timestamp() else r.window_start end
    returning hits into v_hits;
  delete from public.survey_rate_limits where window_start < now() - interval '2 days';
  return v_hits <= p_limit;
end $$;

create or replace function public.save_survey_round(
  p_session_id uuid, p_owner_hash text, p_round integer, p_answers jsonb, p_next_questions jsonb
) returns jsonb language plpgsql set search_path = public, pg_temp as $$
declare s public.survey_sessions%rowtype; prior public.survey_rounds%rowtype; merged jsonb;
begin
  -- Lock serializes concurrent submissions and the pending-scenario transition.
  select * into s from public.survey_sessions where id = p_session_id and owner_hash = p_owner_hash for update;
  if not found or s.abandoned_at is not null then raise exception 'SESSION_NOT_FOUND'; end if;
  select * into prior from public.survey_rounds where session_id = p_session_id and round = p_round;
  if found then
    if prior.answers <> p_answers then raise exception 'ANSWER_CONFLICT'; end if;
    return jsonb_build_object('duplicate', true, 'savedRound', prior.round, 'session', to_jsonb(s) - 'owner_hash');
  end if;
  if s.completed_at is not null or p_round <> s.completed_rounds + 1 or p_round not between 1 and 30 then raise exception 'ROUND_CONFLICT'; end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> 2 then raise exception 'INVALID_ANSWERS'; end if;
  if jsonb_typeof(s.pending_questions) <> 'array' or jsonb_array_length(s.pending_questions) <> 2 then raise exception 'INVALID_SCENARIO'; end if;
  if (select count(distinct a->>'questionId') from jsonb_array_elements(p_answers) a) <> 2 then raise exception 'INVALID_ANSWERS'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_answers) a
    where not exists (
      select 1 from jsonb_array_elements(s.pending_questions) q,
        jsonb_array_elements(q->'options') o
      where q->>'id' = a->>'questionId' and o->>'code' = a->>'answerCode' and o->>'label' = a->>'answer'
    )
  ) then raise exception 'INVALID_ANSWERS'; end if;
  if p_round < 30 and (jsonb_typeof(p_next_questions) <> 'array' or jsonb_array_length(p_next_questions) <> 2) then raise exception 'INVALID_SCENARIO'; end if;
  select jsonb_agg(q || jsonb_build_object('answer', a->>'answer', 'answerCode', a->>'answerCode') order by (q->>'id')::integer)
    into merged from jsonb_array_elements(s.pending_questions) q
    join jsonb_array_elements(p_answers) a on q->>'id' = a->>'questionId';
  insert into public.survey_rounds(session_id, round, answers, questions) values(p_session_id, p_round, p_answers, merged);
  update public.survey_sessions set
    completed_rounds = p_round,
    pending_questions = case when p_round = 30 then '[]'::jsonb else p_next_questions end,
    completed_at = case when p_round = 30 then now() else null end,
    updated_at = now()
    where id = p_session_id returning * into s;
  return jsonb_build_object('duplicate', false, 'savedRound', p_round, 'session', to_jsonb(s) - 'owner_hash');
end $$;

revoke all on function public.consume_survey_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.save_survey_round(uuid, text, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.consume_survey_limit(text, integer, integer) to service_role;
grant execute on function public.save_survey_round(uuid, text, integer, jsonb, jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
