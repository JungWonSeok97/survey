begin;
-- Existing responses are preserved. New sessions only accept the assigned pairs.
alter table public.survey_sessions add constraint survey_assigned_groups
check (question_ids in (array[1,2],array[3,4],array[5,6],array[7,8])) not valid;
-- No unassigned sessions exist at this deployment; validate historical rows too.
alter table public.survey_sessions validate constraint survey_assigned_groups;
notify pgrst, 'reload schema';
commit;
