-- 011_client_logo_storage.sql
--
-- Lehetővé teszi, hogy az ügyfél a brief-varázslóban feltöltse a meglévő
-- logóját. Létrehoz egy publikus Storage bucketet ("client-logos") a
-- logófájloknak, RLS szabályokat rá (csak a saját mappájába tölthet fel /
-- módosíthat / törölhet, admin bármit), és egy logo_url oszlopot a
-- client_projects táblán a végleges publikus URL tárolására.
--
-- Az útvonal-konvenció {user_id}/{fájlnév} — a projekt sor a wizard végén
-- jön csak létre, így feltöltéskor még nincs project_id, amit használni
-- lehetne az útvonalban.
--
-- A migrációk manuálisan futnak a Supabase SQL editorban — ez a fájl önmagában
-- biztonságosan alkalmazható, nem függ más, még le nem futtatott változástól.

insert into storage.buckets (id, name, public)
values ('client-logos', 'client-logos', true)
on conflict (id) do nothing;

drop policy if exists "Clients can upload own logos" on storage.objects;
create policy "Clients can upload own logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'client-logos'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Clients can update own logos" on storage.objects;
create policy "Clients can update own logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'client-logos'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Clients can delete own logos" on storage.objects;
create policy "Clients can delete own logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'client-logos'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Clients can view own logos" on storage.objects;
create policy "Clients can view own logos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'client-logos'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

alter table public.client_projects add column if not exists logo_url text;

notify pgrst, 'reload schema';
