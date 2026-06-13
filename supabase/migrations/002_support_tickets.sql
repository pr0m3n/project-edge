create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $projectedge$
begin
  new.updated_at = now();
  return new;
end;
$projectedge$ language plpgsql;

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

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'answered', 'closed')),
  source text not null default 'projectedge.hu',
  admin_reply text
);

alter table public.support_tickets
add column if not exists id uuid default gen_random_uuid(),
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now(),
add column if not exists name text,
add column if not exists email text,
add column if not exists message text,
add column if not exists status text not null default 'open',
add column if not exists source text not null default 'projectedge.hu',
add column if not exists admin_reply text;

update public.support_tickets
set
  name = coalesce(name, 'Ismeretlen'),
  email = coalesce(email, 'unknown@example.com'),
  message = coalesce(message, 'Korábbi hiányos ticket'),
  status = coalesce(status, 'open'),
  source = coalesce(source, 'projectedge.hu');

alter table public.support_tickets
alter column name set not null,
alter column email set not null,
alter column message set not null;

do $projectedge$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'support_tickets_status_check'
  ) then
    alter table public.support_tickets
    add constraint support_tickets_status_check
    check (status in ('open', 'answered', 'closed'));
  end if;
end;
$projectedge$;

grant insert on public.support_tickets to anon;
grant select, insert, update, delete on public.support_tickets to authenticated;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "Anyone can create support tickets" on public.support_tickets;
create policy "Anyone can create support tickets"
on public.support_tickets for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can manage support tickets" on public.support_tickets;
create policy "Admins can manage support tickets"
on public.support_tickets for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

notify pgrst, 'reload schema';
