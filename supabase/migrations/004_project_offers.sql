alter table public.client_projects add column if not exists offer_title text;
alter table public.client_projects add column if not exists offer_summary text;
alter table public.client_projects add column if not exists offer_scope text;
alter table public.client_projects add column if not exists offer_timeline text;
alter table public.client_projects add column if not exists offer_deliverables text;
alter table public.client_projects add column if not exists offer_price integer;
alter table public.client_projects add column if not exists offer_currency text not null default 'Ft';
alter table public.client_projects add column if not exists offer_note text;
alter table public.client_projects add column if not exists offer_status text not null default 'draft';
alter table public.client_projects add column if not exists offer_sent_at timestamptz;
alter table public.client_projects add column if not exists client_decision_note text;

alter table public.client_projects
  drop constraint if exists client_projects_offer_status_check;

alter table public.client_projects
  add constraint client_projects_offer_status_check
  check (offer_status in ('draft', 'sent', 'accepted', 'declined'));
