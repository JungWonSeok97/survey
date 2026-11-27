begin;
-- Read-only grouping: never rewrite or deduplicate the source responses.
-- Incomplete identities stay separate; matching names alone never merge people.
create view public.survey_legacy_records with (security_invoker = true) as
select r.*,
  encode(sha256(convert_to(
    case when nullif(btrim(employee_id),'') is not null
      and nullif(btrim(name),'') is not null and nullif(btrim(date_of_birth),'') is not null
    then jsonb_build_array('identity',btrim(employee_id),btrim(name),btrim(date_of_birth))::text
    else jsonb_build_array('record',id::text)::text end, 'UTF8')), 'hex') as person_id,
  case when btrim(years) ~ '^[0-9]+([.][0-9]+)?$' then btrim(years)::numeric else null end as years_numeric
from public.survey_responses r;

create view public.survey_legacy_people with (security_invoker = true) as
with groups as (
  select person_id,count(*)::integer record_count,
    sum(case when jsonb_typeof(questions)='array' then jsonb_array_length(questions) else 0 end)::integer answer_count,
    min(saved_at) first_saved_at,max(saved_at) last_saved_at,
    (array_agg(id order by saved_at desc nulls last,id desc))[1] latest_record_id
  from public.survey_legacy_records group by person_id
)
select g.*,r.name,r.employee_id,r.affiliation,r.job,r.years,r.years_numeric,
  to_jsonb(r)-'questions'-'person_id'-'years_numeric' as profile
from groups g join public.survey_legacy_records r on r.id=g.latest_record_id;
-- Export all historical rounds for people matching the list's latest profile.
create view public.survey_legacy_answers with (security_invoker = true) as
select r.*,p.years_numeric as person_years_numeric
from public.survey_legacy_records r join public.survey_legacy_people p using (person_id);
revoke all on public.survey_legacy_records,public.survey_legacy_people,public.survey_legacy_answers from public,anon,authenticated;
grant select on public.survey_legacy_records,public.survey_legacy_people,public.survey_legacy_answers to service_role;
notify pgrst, 'reload schema';
commit;
