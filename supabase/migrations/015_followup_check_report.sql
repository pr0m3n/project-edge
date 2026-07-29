alter table public.client_projects
  add column if not exists followup_checklist jsonb not null default '[]'::jsonb,
  add column if not exists followup_check_report text;

comment on column public.client_projects.followup_checklist is
  'Required admin checklist for the paid post-launch operational review.';

comment on column public.client_projects.followup_check_report is
  'Plain-language result and recommended next steps shared with the client.';

notify pgrst, 'reload schema';
