-- A ProjectEdge két kereskedelmi modellje: menedzselt előfizetés és egyszeri vásárlás.
alter table public.client_projects
  add column if not exists commercial_model text not null default 'purchase',
  add column if not exists subscription_plan text,
  add column if not exists monthly_price integer,
  add column if not exists billing_cycle_started_at timestamptz,
  add column if not exists next_billing_at timestamptz,
  add column if not exists pause_requested_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists resume_requested_at timestamptz,
  add column if not exists cancel_effective_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists managed_domain_name text,
  add column if not exists domain_registered_at timestamptz,
  add column if not exists domain_renewal_at timestamptz,
  add column if not exists domain_status text,
  add column if not exists domain_transfer_requested_at timestamptz,
  add column if not exists purchase_option_price integer,
  add column if not exists site_health_status text,
  add column if not exists last_health_check_at timestamptz;

alter table public.client_projects drop constraint if exists client_projects_commercial_model_check;
alter table public.client_projects add constraint client_projects_commercial_model_check
  check (commercial_model in ('subscription', 'purchase'));

alter table public.client_projects drop constraint if exists client_projects_subscription_plan_check;
alter table public.client_projects add constraint client_projects_subscription_plan_check
  check (subscription_plan is null or subscription_plan in ('presence', 'business', 'custom'));

alter table public.client_projects drop constraint if exists client_projects_subscription_status_check;
alter table public.client_projects add constraint client_projects_subscription_status_check
  check (subscription_status is null or subscription_status in
    ('agreement_pending', 'first_payment_pending', 'active', 'pause_requested', 'paused', 'resume_requested', 'cancel_requested', 'cancelled'));

alter table public.client_projects drop constraint if exists client_projects_domain_status_check;
alter table public.client_projects add constraint client_projects_domain_status_check
  check (domain_status is null or domain_status in ('searching', 'reserved', 'active', 'transfer_requested', 'transferred', 'released'));

alter table public.client_projects drop constraint if exists client_projects_site_health_status_check;
alter table public.client_projects add constraint client_projects_site_health_status_check
  check (site_health_status is null or site_health_status in ('unknown', 'healthy', 'attention', 'offline'));

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  billing_period_start timestamptz not null,
  billing_period_end timestamptz not null,
  amount integer not null check (amount > 0),
  currency text not null default 'Ft',
  status text not null default 'pending' check (status in ('pending', 'reported', 'paid', 'failed', 'void')),
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.change_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('content', 'design', 'technical', 'new_feature')),
  description text not null,
  status text not null default 'new' check (status in ('new', 'planned', 'in_progress', 'waiting_client', 'completed', 'declined')),
  included_in_plan boolean,
  admin_note text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.subscription_payments enable row level security;
alter table public.change_requests enable row level security;

create policy "Clients view own subscription payments" on public.subscription_payments
  for select to authenticated using (
    exists (select 1 from public.client_projects p where p.id = project_id and (p.user_id = auth.uid() or public.is_admin()))
  );
create policy "Admins manage subscription payments" on public.subscription_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Clients view own change requests" on public.change_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "Clients create own change requests" on public.change_requests
  for insert to authenticated with check (
    user_id = auth.uid() and exists (select 1 from public.client_projects p where p.id = project_id and p.user_id = auth.uid())
  );
create policy "Admins manage change requests" on public.change_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists subscription_payments_project_idx on public.subscription_payments(project_id, billing_period_start desc);
create index if not exists change_requests_project_idx on public.change_requests(project_id, requested_at desc);

notify pgrst, 'reload schema';
