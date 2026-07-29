insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', true)
on conflict (id) do nothing;

drop policy if exists "Clients can upload own project assets" on storage.objects;
create policy "Clients can upload own project assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-assets'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Clients can view own project assets" on storage.objects;
create policy "Clients can view own project assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'client-assets'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Clients can delete own project assets" on storage.objects;
create policy "Clients can delete own project assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'client-assets'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

alter table public.client_projects
  add column if not exists subscription_status text,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_cancel_requested_at timestamptz;

alter table public.client_projects
  drop constraint if exists client_projects_subscription_status_check;

alter table public.client_projects
  add constraint client_projects_subscription_status_check
  check (subscription_status is null or subscription_status in ('pending_activation', 'active', 'cancel_requested', 'cancelled'));

notify pgrst, 'reload schema';
