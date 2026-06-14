-- Drop old status check if it exists
alter table public.client_projects
  drop constraint if exists client_projects_status_check;

-- Add updated status check constraint
alter table public.client_projects
  add constraint client_projects_status_check
  check (status in ('request_received', 'planning', 'offer_sent', 'deposit_pending', 'contract_pending', 'in_progress', 'review', 'launched', 'paused', 'closed', 'deletion_pending'));

-- Add new columns to client_projects
alter table public.client_projects add column if not exists brief_data jsonb;
alter table public.client_projects add column if not exists last_modified_at timestamptz;
alter table public.client_projects add column if not exists last_modified_by uuid references auth.users(id);
alter table public.client_projects add column if not exists last_modified_by_name text;
alter table public.client_projects add column if not exists delete_requested boolean not null default false;
alter table public.client_projects add column if not exists delete_requested_at timestamptz;
alter table public.client_projects add column if not exists status_before_delete_request text;
alter table public.client_projects add column if not exists deposit_amount integer;
alter table public.client_projects add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'deposit_paid', 'fully_paid'));
alter table public.client_projects add column if not exists contract_accepted boolean not null default false;
alter table public.client_projects add column if not exists contract_accepted_at timestamptz;
alter table public.client_projects add column if not exists milestones jsonb not null default '[]'::jsonb;
alter table public.client_projects add column if not exists feedback_round integer not null default 0;
alter table public.client_projects add column if not exists feedback_notes text;
alter table public.client_projects add column if not exists handover_checklist jsonb not null default '[]'::jsonb;
alter table public.client_projects add column if not exists maintenance_option text;
alter table public.client_projects add column if not exists client_rating integer check (client_rating between 1 and 5);
alter table public.client_projects add column if not exists client_review text;
alter table public.client_projects add column if not exists reference_permitted boolean not null default false;

-- Create project changes log table
create table if not exists public.project_change_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text not null,
  changed_at timestamptz not null default now(),
  field_name text not null,
  old_value text,
  new_value text
);

-- Grant permissions
grant select, insert on public.project_change_logs to authenticated;

-- Enable Row Level Security
alter table public.project_change_logs enable row level security;

-- Policies for project_change_logs
drop policy if exists "Clients can read own project logs" on public.project_change_logs;
create policy "Clients can read own project logs"
  on public.project_change_logs for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.client_projects
      where client_projects.id = project_change_logs.project_id
        and client_projects.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert own project logs" on public.project_change_logs;
create policy "Clients can insert own project logs"
  on public.project_change_logs for insert
  to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.client_projects
      where client_projects.id = project_change_logs.project_id
        and client_projects.user_id = auth.uid()
    )
  );

-- Enable realtime for project_change_logs
do $projectedge_realtime_logs$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'project_change_logs'
  ) then
    alter publication supabase_realtime add table public.project_change_logs;
  END if;
end;
$projectedge_realtime_logs$;

notify pgrst, 'reload schema';
