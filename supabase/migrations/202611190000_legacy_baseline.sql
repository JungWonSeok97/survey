-- Empty installations need the historical table before installing reporting views.
begin;
create table if not exists public.survey_responses (
  id uuid default gen_random_uuid() not null,
  name character varying(255) not null,
  affiliation character varying(255) not null,
  job character varying(255) not null,
  years character varying(100) not null,
  employee_id character varying(255),
  "position" character varying(255),
  department character varying(255),
  gender character varying(50),
  date_of_birth character varying(100),
  office_phone character varying(20),
  company_email character varying(255),
  railroad_certification character varying(255),
  job_education character varying(255),
  health_check_date character varying(100),
  body_temperature character varying(50),
  systolic_bp character varying(50),
  diastolic_bp character varying(50),
  pulse character varying(50),
  work_type character varying(255),
  work_time character varying(255),
  employee_card_number character varying(255),
  round integer not null,
  questions jsonb not null,
  saved_at timestamp with time zone default now(),
  occupation_detail character varying default ''::character varying,
  overtime_period character varying default ''::character varying,
  overtime_long character varying default ''::character varying,
  physical_effort character varying default ''::character varying,
  cognitive_focus character varying default ''::character varying,
  accident_loss character varying default ''::character varying,
  primary key (id)
);
alter table public.survey_responses enable row level security;
revoke all on public.survey_responses from public, anon, authenticated;
grant select on public.survey_responses to service_role;
commit;
