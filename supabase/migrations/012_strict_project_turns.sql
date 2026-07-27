alter table public.client_projects
  add column if not exists deposit_transfer_reported boolean not null default false,
  add column if not exists final_transfer_reported boolean not null default false,
  add column if not exists review_approved boolean not null default false,
  add column if not exists maintenance_monthly_fee integer,
  add column if not exists maintenance_currency text not null default 'Ft';

alter table public.client_projects
  drop constraint if exists client_projects_maintenance_monthly_fee_check;

alter table public.client_projects
  add constraint client_projects_maintenance_monthly_fee_check
  check (maintenance_monthly_fee is null or maintenance_monthly_fee > 0);

comment on column public.client_projects.deposit_transfer_reported is
  'The client reported sending the deposit; the admin must verify it before development starts.';
comment on column public.client_projects.final_transfer_reported is
  'The client reported sending the final payment; the admin must verify it before handover continues.';
comment on column public.client_projects.review_approved is
  'The client approved the review version; only the admin may launch after this.';
comment on column public.client_projects.maintenance_monthly_fee is
  'Monthly maintenance offer set by the admin and shown to the client.';
