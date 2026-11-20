begin;
-- Pure identity function, matching the original view's exact grouping rules.
create function public.survey_legacy_person_id(p_id uuid,p_employee text,p_name text,p_birth text)
returns text language sql immutable parallel safe set search_path = pg_catalog as $$
 select encode(sha256(convert_to(case
 when nullif(btrim(p_employee),'') is not null and nullif(btrim(p_name),'') is not null and nullif(btrim(p_birth),'') is not null
 then jsonb_build_array('identity',btrim(p_employee),btrim(p_name),btrim(p_birth))::text
 else jsonb_build_array('record',p_id::text)::text end,'UTF8')),'hex')
$$;
revoke all on function public.survey_legacy_person_id(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.survey_legacy_person_id(uuid,text,text,text) to service_role;
create index survey_legacy_person_history on public.survey_responses
 (public.survey_legacy_person_id(id,employee_id,name,date_of_birth),saved_at asc nulls last,id);
create or replace view public.survey_legacy_records with (security_invoker=true) as
select r.*,public.survey_legacy_person_id(id,employee_id,name,date_of_birth) as person_id,
 case when btrim(years) ~ '^[0-9]+([.][0-9]+)?$' then btrim(years)::numeric else null end as years_numeric
from public.survey_responses r;
create materialized view public.survey_legacy_people_cache as select * from public.survey_legacy_people;
create unique index survey_legacy_people_cache_id on public.survey_legacy_people_cache(person_id);
create index survey_legacy_people_cache_recent on public.survey_legacy_people_cache(last_saved_at desc nulls last,person_id);
revoke all on public.survey_legacy_people_cache from public,anon,authenticated;
grant select on public.survey_legacy_people_cache to service_role;
-- Legacy records are normally read-only. Administrative corrections refresh
-- the summary in the same transaction; new survey writes use other tables.
create function public.refresh_survey_legacy_people_cache() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 refresh materialized view public.survey_legacy_people_cache;
 return null;
end $$;
revoke all on function public.refresh_survey_legacy_people_cache() from public,anon,authenticated;
create trigger survey_legacy_people_cache_refresh after insert or update or delete or truncate on public.survey_responses
for each statement execute function public.refresh_survey_legacy_people_cache();
create or replace view public.survey_legacy_answers with (security_invoker=true) as
select r.*,p.years_numeric as person_years_numeric
from public.survey_legacy_records r join public.survey_legacy_people_cache p using(person_id);
create function public.verify_survey_admin_session(p_token_hash text) returns jsonb
language sql stable security invoker set search_path=pg_catalog as $$
 select jsonb_build_object('id',a.id,'username',a.username,'is_active',a.is_active)
 from public.survey_admin_sessions s join public.survey_admins a on a.id=s.admin_id
 where s.token_hash=p_token_hash and s.expires_at>now() and a.is_active
$$;
revoke all on function public.verify_survey_admin_session(text) from public,anon,authenticated;
grant execute on function public.verify_survey_admin_session(text) to service_role;
analyze public.survey_legacy_people_cache;
notify pgrst, 'reload schema';
commit;
