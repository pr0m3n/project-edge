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

drop table if exists public.support_ticket_messages cascade;
drop table if exists public.support_tickets cascade;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  visitor_token text not null,
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'answered', 'closed')),
  source text not null default 'projectedge.hu',
  admin_reply text
);

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  sender text not null check (sender in ('customer', 'admin')),
  body text not null
);

create index support_ticket_messages_ticket_created_idx
on public.support_ticket_messages(ticket_id, created_at);

create or replace function public.touch_support_ticket()
returns trigger as $projectedge$
begin
  update public.support_tickets
  set
    updated_at = now(),
    last_message_at = now(),
    status = case
      when new.sender = 'admin' then 'answered'
      when status = 'closed' then 'open'
      else status
    end
  where id = new.ticket_id;

  return new;
end;
$projectedge$ language plpgsql;

drop trigger if exists support_ticket_messages_touch_ticket on public.support_ticket_messages;
create trigger support_ticket_messages_touch_ticket
after insert on public.support_ticket_messages
for each row execute function public.touch_support_ticket();

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function public.set_updated_at();

grant select, insert, update on public.support_tickets to anon;
grant select, insert on public.support_ticket_messages to anon;
grant select, insert, update, delete on public.support_tickets to authenticated;
grant select, insert, update, delete on public.support_ticket_messages to authenticated;

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop policy if exists "Visitors can create support tickets" on public.support_tickets;
create policy "Visitors can create support tickets"
on public.support_tickets for insert
to anon, authenticated
with check (true);

drop policy if exists "Visitors can read support tickets by app route" on public.support_tickets;
create policy "Visitors can read support tickets by app route"
on public.support_tickets for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage support tickets" on public.support_tickets;
create policy "Admins can manage support tickets"
on public.support_tickets for all
to authenticated
using (true)
with check (true);

drop policy if exists "Visitors can create customer messages" on public.support_ticket_messages;
create policy "Visitors can create customer messages"
on public.support_ticket_messages for insert
to anon, authenticated
with check (sender = 'customer');

drop policy if exists "Visitors can read ticket messages by app route" on public.support_ticket_messages;
create policy "Visitors can read ticket messages by app route"
on public.support_ticket_messages for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage ticket messages" on public.support_ticket_messages;
create policy "Admins can manage ticket messages"
on public.support_ticket_messages for all
to authenticated
using (true)
with check (true);

notify pgrst, 'reload schema';
