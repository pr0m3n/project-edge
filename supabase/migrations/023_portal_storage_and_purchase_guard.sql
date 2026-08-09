-- Ügyfélkapu stabilizálás:
-- 1. A brief minden feltöltése ugyanabba a privát client-assets bucketbe kerül.
-- 2. Egy menedzselt weboldalhoz egyszerre csak egy nyitott megvásárlási igény
--    létezhet, így több böngészőfülről sem hozható létre duplikáció.

insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', false)
on conflict (id) do update set public = false;

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

create or replace function public.guard_duplicate_website_purchase_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if left(new.description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]' and exists (
    select 1
    from public.change_requests existing
    where existing.project_id = new.project_id
      and left(existing.description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
      and existing.status not in ('completed', 'declined')
  ) then
    raise exception 'Ehhez a weboldalhoz már van folyamatban lévő megvásárlási igény.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_duplicate_website_purchase_request on public.change_requests;
create trigger guard_duplicate_website_purchase_request
before insert on public.change_requests
for each row execute function public.guard_duplicate_website_purchase_request();

notify pgrst, 'reload schema';
