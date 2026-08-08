-- Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- NULL means it's an admin notification
  title text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Grant permissions
revoke all on public.notifications from anon;
grant select, insert, update on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- Enable Row Level Security
alter table public.notifications enable row level security;

-- Policies for notifications
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_admin()));

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_admin()))
  with check (user_id = auth.uid() or (user_id is null and public.is_admin()));

drop policy if exists "Admins can insert notifications" on public.notifications;
create policy "Admins can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin());

-- Enable realtime for notifications
do $projectedge_realtime_notifications$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  END if;
end;
$projectedge_realtime_notifications$;

notify pgrst, 'reload schema';
