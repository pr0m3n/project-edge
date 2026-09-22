-- 040_payment_reminders.sql
--
-- FIZETÉSI EMLÉKEZTETŐ ÜTEMEZÉSE.
--
-- A kártyás ügyfelet a Stripe magától megkeresi, ha nem sikerül a terhelés.
-- Az utalásos ügyfélnél viszont NINCS ilyen: a fordulónap eljön, és ha ő
-- elfelejti, arról senki nem tud — sem ő, sem én. A rendszer eddig még azt
-- sem tudta volna megmondani, hogy valaki késésben van.
--
-- A `reminder_sent_at` (038) csak azt rögzítette, hogy ment-e már levél. Ez
-- ahhoz kevés, hogy egy fokozatos sorozatot vezessünk: az „esedékes lesz",
-- az „esedékes volt" és a „régóta nem fizetett" három különböző hangnem, és
-- a köztük lévő váltást valahol számon kell tartani. Ez az oszlop a számláló.
--
--   0 = még nem ment semmi
--   1 = előzetes emlékeztető (az esedékesség ELŐTT)
--   2 = az esedékesség napján
--   3 = késés — az ügyfél és az admin is kap jelzést
--
-- A számláló azért kell, és nem a dátumból számolunk: egy elakadt vagy
-- kétszer lefutó cron különben ugyanazt a levelet küldené újra és újra.

alter table public.subscription_payments
  add column if not exists reminder_stage integer not null default 0;

comment on column public.subscription_payments.reminder_stage is
  'Meddig jutott a fizetési emlékeztető sorozat: 0 = nem ment, 1 = előzetes, 2 = esedékes, 3 = késés. A számláló teszi idempotenssé a napi cront.';

alter table public.subscription_payments drop constraint if exists subscription_payments_reminder_stage_check;
alter table public.subscription_payments add constraint subscription_payments_reminder_stage_check
  check (reminder_stage between 0 and 3);

-- A napi cron pontosan ezt a lekérdezést futtatja: nyitott befizetések
-- esedékesség szerint. Részleges index, mert a rendezett sorok soha nem
-- kerülnek elő — azok idővel a tábla túlnyomó részét fogják kitenni.
create index if not exists subscription_payments_reminder_idx
  on public.subscription_payments(due_date, reminder_stage)
  where status = 'pending';

notify pgrst, 'reload schema';
