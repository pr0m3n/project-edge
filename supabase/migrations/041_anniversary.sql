-- 041_anniversary.sql
--
-- ÉVFORDULÓS LEVÉL — egyszer, évente, ügyfelenként.
--
-- Miért kell külön oszlop, és miért nem a dátumból számolunk: az évforduló
-- egyetlen naptári nap. Ha a napi cron aznap kétszer fut (újrapróbálkozás,
-- párhuzamos régió), vagy ha egy nap kimarad és utólag pótoljuk, akkor a puszta
-- dátumfeltétel vagy kétszer küldene, vagy sosem. Az utolsó kiküldés dátuma
-- ezt egyértelműen eldönti.
--
-- Miért ér valamit ez a levél: egy havidíjas szolgáltatásnál az egyéves pont
-- az, ahol az ügyfél fejben újraértékeli, hogy megéri-e. Ha ekkor kap egy
-- összefoglalót arról, mi történt az évben — hány módosítás, mennyi
-- rendelkezésre állás, mennyit fizetett —, akkor az újraértékelés tényeken
-- alapul, nem azon az érzésen, hogy „megy magától, minek fizetek".

alter table public.client_projects
  add column if not exists anniversary_email_sent_at timestamptz;

comment on column public.client_projects.anniversary_email_sent_at is
  'Mikor ment ki az utolsó évfordulós levél. Ez teszi idempotenssé a napi cront — egy évfordulóhoz egy levél.';

create index if not exists client_projects_anniversary_idx
  on public.client_projects(subscription_started_at)
  where subscription_status = 'active';

notify pgrst, 'reload schema';
