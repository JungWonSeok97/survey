begin;
create table public.survey_admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_.-]{2,63}$'),
  password_hash text not null check (password_hash ~ '^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  password_changed_at timestamptz not null default now()
);
create table public.survey_admin_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  admin_id uuid not null references public.survey_admins(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 hour')
);
create index survey_admin_sessions_admin on public.survey_admin_sessions(admin_id);
create index survey_admin_sessions_expiry on public.survey_admin_sessions(expires_at);
alter table public.survey_admins enable row level security;
alter table public.survey_admin_sessions enable row level security;
revoke all on public.survey_admins, public.survey_admin_sessions from public, anon, authenticated;
grant all on public.survey_admins, public.survey_admin_sessions to service_role;
-- Account locks serialize session issuance and password rotation.
create function public.issue_survey_admin_session(p_admin_id uuid, p_password_hash text, p_token_hash text)
returns boolean language plpgsql set search_path = public, pg_temp as $$
begin
  perform 1 from public.survey_admins where id=p_admin_id and is_active and password_hash=p_password_hash for update;
  if not found then return false; end if;
  delete from public.survey_admin_sessions where expires_at <= now();
  insert into public.survey_admin_sessions(token_hash, admin_id) values(p_token_hash,p_admin_id);
  return true;
end $$;
create function public.change_survey_admin_password(p_admin_id uuid, p_token_hash text, p_old_hash text, p_new_hash text)
returns boolean language plpgsql set search_path = public, pg_temp as $$
begin
  perform 1 from public.survey_admins where id=p_admin_id and is_active and password_hash=p_old_hash for update;
  if not found then return false; end if;
  perform 1 from public.survey_admin_sessions where token_hash=p_token_hash and admin_id=p_admin_id and expires_at>now() for update;
  if not found then return false; end if;
  update public.survey_admins set password_hash=p_new_hash,password_changed_at=now() where id=p_admin_id;
  delete from public.survey_admin_sessions where admin_id=p_admin_id;
  return true;
end $$;
revoke all on function public.issue_survey_admin_session(uuid,text,text) from public,anon,authenticated;
revoke all on function public.change_survey_admin_password(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.issue_survey_admin_session(uuid,text,text) to service_role;
grant execute on function public.change_survey_admin_password(uuid,text,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
