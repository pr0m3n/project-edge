create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  company text,
  website text,
  project_type text not null,
  budget text,
  timeline text not null,
  goals text not null,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'proposal_sent', 'won', 'lost', 'archived')),
  source text not null default 'projectedge.hu',
  notes text
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  company text,
  website text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'past')),
  notes text
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  slug text unique,
  project_type text not null,
  status text not null default 'planning'
    check (status in ('planning', 'design', 'build', 'review', 'launched', 'care')),
  budget_amount integer,
  launch_target date,
  summary text,
  public_case_study boolean not null default false
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  slug text not null unique,
  client_name text,
  industry text,
  result_label text,
  summary text not null,
  image_url text,
  featured boolean not null default false,
  published boolean not null default false
);

create or replace function public.set_updated_at()
returns trigger as $projectedge$
begin
  new.updated_at = now();
  return new;
end;
$projectedge$ language plpgsql;

drop trigger if exists quote_requests_set_updated_at on public.quote_requests;
create trigger quote_requests_set_updated_at
before update on public.quote_requests
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.quote_requests enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.portfolio_items enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $projectedge$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$projectedge$;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users for select
to authenticated
using (public.is_admin());

drop policy if exists "Anyone can create quote requests" on public.quote_requests;
create policy "Anyone can create quote requests"
on public.quote_requests for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can manage quote requests" on public.quote_requests;
create policy "Admins can manage quote requests"
on public.quote_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage clients" on public.clients;
create policy "Admins can manage clients"
on public.clients for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage projects" on public.projects;
create policy "Admins can manage projects"
on public.projects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Published portfolio is public" on public.portfolio_items;
create policy "Published portfolio is public"
on public.portfolio_items for select
to anon, authenticated
using (published = true);

drop policy if exists "Admins can manage portfolio" on public.portfolio_items;
create policy "Admins can manage portfolio"
on public.portfolio_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
