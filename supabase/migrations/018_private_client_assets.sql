-- 018_private_client_assets.sql
--
-- FONTOS BIZTONSÁGI JAVÍTÁS.
--
-- A `client-assets` és `client-logos` bucketek eddig publikusak voltak
-- (`public = true`), és a kliens `getPublicUrl()`-lel mentett linket. Ez azt
-- jelentette, hogy a domain-tulajdonosi igazolások (amelyeken név, cím és
-- telefonszám szerepel), a feltöltött szövegek és a logók bejelentkezés nélkül
-- elérhetők voltak annak, aki ismerte vagy kitalálta az URL-t. A mellettük
-- lévő SELECT policy ilyenkor nem védett semmit.
--
-- Ez a migráció priváttá teszi a bucketeket. A kód ettől kezdve az objektum
-- útvonalát tárolja, és megjelenítéskor rövid életű signed URL-t kér
-- (lib/storage-assets.ts). A régi, adatbázisban tárolt publikus URL-ekből a
-- kód kiszedi az útvonalat, és azokra is signed URL-t kér, tehát a meglévő
-- feltöltések továbbra is megnyithatók — csak már hitelesítés után.

update storage.buckets set public = false where id in ('client-assets', 'client-logos');

-- A SELECT policyk maradnak (saját mappa vagy admin), de mostantól tényleg
-- ezek döntenek a hozzáférésről. Újra kiírjuk őket, hogy ez a fájl önmagában
-- is elég legyen egy friss projekten.

drop policy if exists "Clients can view own project assets" on storage.objects;
create policy "Clients can view own project assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'client-assets'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists "Clients can view own logos" on storage.objects;
create policy "Clients can view own logos"
on storage.objects for select to authenticated
using (
  bucket_id = 'client-logos'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

notify pgrst, 'reload schema';
