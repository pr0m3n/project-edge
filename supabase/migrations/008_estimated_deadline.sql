-- Estimated deadline: admin sets a target handover date, client sees it
alter table public.client_projects
  add column if not exists estimated_deadline date;

notify pgrst, 'reload schema';
