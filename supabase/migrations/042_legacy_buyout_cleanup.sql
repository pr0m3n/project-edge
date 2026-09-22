-- 042_legacy_buyout_cleanup.sql
--
-- A TEENDŐLISTÁN RAGADT, DUPLIKÁLT KIVÁSÁRLÁSI KÉRÉSEK.
--
-- Mi történt: a 033-as migráció átvitte a régi kivásárlási kéréseket az új
-- `website_purchases` folyamatba, és a `change_requests` sorokat lezárta. De
-- SZIGORÚ feltétellel kereste őket:
--
--     left(description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
--
-- A felület viszont LAZÁN ismeri fel ugyanezeket (`isWebsitePurchaseRequest`
-- a `lib/subscriptions.ts`-ben): a prefix mellett elfogadja a „megvásárolni a
-- weboldalt", a „vételi opció" és a „tulajdonba vétel" szövegeket is. Az a
-- néhány régi sor, amiben nem volt ott a prefix, így kimaradt a lezárásból,
-- viszont a teendőlistán továbbra is kivásárlásként jelent meg — egymás után
-- többször, egyformán, és elrejtve is visszajött, mert mindegyik külön sor.
--
-- Ez a migráció a felület szabálya szerint zárja le őket, tehát a kettő
-- ezután ugyanazt a halmazt látja.

update public.change_requests
set
  status = 'completed',
  completed_at = coalesce(completed_at, now()),
  admin_note = coalesce(admin_note, '')
    || case when coalesce(admin_note, '') = '' then '' else E'\n\n' end
    || 'Lezárva: átkerült a tulajdonba-vételi folyamatba (042).'
where status not in ('completed', 'declined')
  and (
    left(description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
    or lower(description) like '%megvásárolni a weboldalt%'
    or lower(description) like '%vételi opció%'
    or lower(description) like '%tulajdonba vétel%'
  );

-- A régi kérésekhez tartozó projekteknél maradjon nyoma annak, hogy volt
-- kivásárlási szándék — enélkül az adminban nem derülne ki, miért tűntek el
-- a teendők. A `website_purchases` rekordot a 033 már létrehozta ott, ahol
-- volt hozzá ár; itt csak a nyom marad.

notify pgrst, 'reload schema';
