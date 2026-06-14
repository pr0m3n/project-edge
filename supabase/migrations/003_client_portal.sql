create extension if not exists pgcrypto;

create table if not exists public.client_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text not null
);

create table if not exists public.client_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contact_name text,
  contact_email text,
  title text not null,
  company text,
  website text,
  project_type text not null,
  budget text,
  goals text not null,
  status text not null default 'request_received'
    check (status in ('request_received', 'planning', 'offer_sent', 'in_progress', 'review', 'launched', 'paused', 'closed')),
  next_step text,
  admin_notes text
);

create table if not exists public.client_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.client_projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  contact_name text,
  contact_email text,
  subject text not null,
  status text not null default 'open'
    check (status in ('open', 'answered', 'closed')),
  rating integer check (rating between 1 and 5),
  rating_comment text
);

create table if not exists public.client_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.client_tickets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  sender text not null check (sender in ('customer', 'admin')),
  body text not null
);

create index if not exists client_projects_user_created_idx
on public.client_projects(user_id, created_at desc);

create index if not exists client_tickets_user_updated_idx
on public.client_tickets(user_id, last_message_at desc);

create index if not exists client_ticket_messages_ticket_created_idx
on public.client_ticket_messages(ticket_id, created_at);

alter table public.client_projects add column if not exists contact_name text;
alter table public.client_projects add column if not exists contact_email text;
alter table public.client_tickets add column if not exists contact_name text;
alter table public.client_tickets add column if not exists contact_email text;

grant select, insert, update, delete on public.client_profiles to authenticated;
grant select, insert, update, delete on public.client_projects to authenticated;
grant select, insert, update, delete on public.client_tickets to authenticated;
grant select, insert, update, delete on public.client_ticket_messages to authenticated;

create or replace function public.touch_client_ticket()
returns trigger as $projectedge_client$
begin
  update public.client_tickets
  set
    updated_at = now(),
    last_message_at = now(),
    status = case
      when new.sender = 'admin' then 'answered'
      when new.sender = 'customer' then 'open'
      else status
    end
  where id = new.ticket_id;

  return new;
end;
$projectedge_client$ language plpgsql;

drop trigger if exists client_ticket_messages_touch_ticket on public.client_ticket_messages;
create trigger client_ticket_messages_touch_ticket
after insert on public.client_ticket_messages
for each row execute function public.touch_client_ticket();

drop trigger if exists client_profiles_set_updated_at on public.client_profiles;
create trigger client_profiles_set_updated_at
before update on public.client_profiles
for each row execute function public.set_updated_at();

drop trigger if exists client_projects_set_updated_at on public.client_projects;
create trigger client_projects_set_updated_at
before update on public.client_projects
for each row execute function public.set_updated_at();

drop trigger if exists client_tickets_set_updated_at on public.client_tickets;
create trigger client_tickets_set_updated_at
before update on public.client_tickets
for each row execute function public.set_updated_at();

alter table public.client_profiles enable row level security;
alter table public.client_projects enable row level security;
alter table public.client_tickets enable row level security;
alter table public.client_ticket_messages enable row level security;

alter table public.client_profiles replica identity full;
alter table public.client_projects replica identity full;
alter table public.client_tickets replica identity full;
alter table public.client_ticket_messages replica identity full;

drop policy if exists "Clients can manage own profile" on public.client_profiles;
create policy "Clients can manage own profile"
on public.client_profiles for all
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Clients can manage own projects" on public.client_projects;
create policy "Clients can manage own projects"
on public.client_projects for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Clients can manage own tickets" on public.client_tickets;
create policy "Clients can manage own tickets"
on public.client_tickets for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Clients can read own ticket messages" on public.client_ticket_messages;
create policy "Clients can read own ticket messages"
on public.client_ticket_messages for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.client_tickets
    where client_tickets.id = client_ticket_messages.ticket_id
      and client_tickets.user_id = auth.uid()
  )
);

drop policy if exists "Clients can create own ticket messages" on public.client_ticket_messages;
create policy "Clients can create own ticket messages"
on public.client_ticket_messages for insert
to authenticated
with check (
  public.is_admin()
  or (
    sender = 'customer'
    and user_id = auth.uid()
    and exists (
      select 1 from public.client_tickets
      where client_tickets.id = client_ticket_messages.ticket_id
        and client_tickets.user_id = auth.uid()
        and client_tickets.status <> 'closed'
    )
  )
);

drop policy if exists "Admins can manage client ticket messages" on public.client_ticket_messages;
create policy "Admins can manage client ticket messages"
on public.client_ticket_messages for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

do $projectedge_client_realtime$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_projects'
  ) then
    alter publication supabase_realtime add table public.client_projects;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_tickets'
  ) then
    alter publication supabase_realtime add table public.client_tickets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_ticket_messages'
  ) then
    alter publication supabase_realtime add table public.client_ticket_messages;
  end if;
end;
$projectedge_client_realtime$;

notify pgrst, 'reload schema';
