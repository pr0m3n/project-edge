-- 038_manual_onboarding.sql
--
-- A KÉZI ÜGYFÉLFELVÉTEL alapja.
--
-- Eddig egyetlen út vezetett be a rendszerbe: a látogató regisztrált az
-- ügyfélkapun, kitöltötte a projektindító adatlapot, és onnantól élt a
-- `client_projects` sora. Ez pontosan azt az ügyfelet zárta ki, aki valójában
-- fizet: aki hideg emailre válaszolt, telefonon és emailben egyeztetett, majd
-- utalt. Róla a rendszer semmit nem tudott, és ő sem látott semmit.
--
-- Ez a migráció nem új folyamatot vezet be, hanem a meglévőbe engedi be azt,
-- akivel offline állapodtunk meg: honnan jött (`origin`), hogyan és milyen
-- ciklusban fizet (`payment_method`, `billing_interval`), meddig van kifizetve
-- (`prepaid_until`), és ki vette fel (`onboarded_by`).
--
-- Külön megjegyzés a `billing_interval`-ról: a kód eddig mindenhol havi
-- ciklust feltételezett (a Stripe ág fixen `interval: "month"`). Az oszlop
-- most rögzíti, ha valaki egy évre előre fizetett — enélkül a
-- `next_billing_at` egy évvel előre mutatna, és minden hónapszámítás elcsúszna
-- rajta.

-- ── 1. client_projects: honnan jött és hogyan fizet ──────────────────────

alter table public.client_projects
  add column if not exists origin text not null default 'portal',
  add column if not exists billing_interval text not null default 'month',
  add column if not exists payment_method text,
  add column if not exists prepaid_until timestamptz,
  add column if not exists onboarded_at timestamptz,
  add column if not exists onboarded_by uuid references auth.users(id) on delete set null,
  add column if not exists live_url text;

comment on column public.client_projects.origin is
  'Hogyan került be az ügyfél: portal = maga regisztrált, manual = admin vette fel, cold_email = hideg email kampányból.';
comment on column public.client_projects.billing_interval is
  'A díjfizetés ciklusa. Az éves előre fizetésnél a next_billing_at egy évvel később esedékes.';
comment on column public.client_projects.payment_method is
  'stripe = kártyás (a Stripe kezeli), bank_transfer = utalás (a befizetést az admin rögzíti).';
comment on column public.client_projects.prepaid_until is
  'Meddig van kifizetve a szolgáltatás. Éves előre fizetésnél ez a döntő, nem a next_billing_at.';
comment on column public.client_projects.live_url is
  'Az éles weboldal címe. Erre fut a 039-es migráció elérhetőség-ellenőrzése.';

alter table public.client_projects drop constraint if exists client_projects_origin_check;
alter table public.client_projects add constraint client_projects_origin_check
  check (origin in ('portal', 'manual', 'cold_email'));

alter table public.client_projects drop constraint if exists client_projects_billing_interval_check;
alter table public.client_projects add constraint client_projects_billing_interval_check
  check (billing_interval in ('month', 'year'));

alter table public.client_projects drop constraint if exists client_projects_payment_method_check;
alter table public.client_projects add constraint client_projects_payment_method_check
  check (payment_method is null or payment_method in ('stripe', 'bank_transfer'));

-- A kézzel felvett ügyfeleknél az admin a `next_billing_at` szerint dolgozik:
-- ez a lekérdezés adja az „kinek esedékes a fizetése" listát.
create index if not exists client_projects_next_billing_idx
  on public.client_projects(next_billing_at)
  where subscription_status = 'active';

-- ── 2. client_profiles: számlázási adat és marketing hozzájárulás ────────
--
-- A számlázási adatok eddig CSAK a `website_purchases` sorban éltek, tehát
-- csak annál, aki megvette a weboldalát. Egy havidíjas ügyfélről a rendszer
-- nem tudta, kinek a nevére kell számlázni. A Billingo-integrációnak viszont
-- pontosan ezek kellenek.
--
-- A marketing hozzájárulás nem formalitás: a havi teljesítmény-levél
-- tranzakciós (a szolgáltatás része), a hírlevél viszont nem az, és csak
-- annak mehet, aki kérte. A `unsubscribe_token` teszi lehetővé, hogy a
-- leiratkozó link bejelentkezés nélkül működjön.

alter table public.client_profiles
  add column if not exists phone text,
  add column if not exists billing_name text,
  add column if not exists billing_tax_number text,
  add column if not exists billing_country text default 'HU',
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_address text,
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz,
  add column if not exists marketing_opt_out_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

comment on column public.client_profiles.marketing_opt_in is
  'Kifejezett hozzájárulás a HÍRLEVÉLHEZ. A szolgáltatás részét képező tranzakciós levelek (számla, teljesítmény-jelentés) ettől függetlenül mennek.';
comment on column public.client_profiles.unsubscribe_token is
  'A leiratkozó link titka. Ezzel a leiratkozás bejelentkezés nélkül is működik, ahogy a levelezési szabványok elvárják.';

create unique index if not exists client_profiles_unsubscribe_token_uidx
  on public.client_profiles(unsubscribe_token);

-- ── 3. subscription_payments: utalásos befizetés és esedékesség ──────────
--
-- A tábla eddig kizárólag Stripe-számlából született. A kézzel rögzített
-- utalásnak nincs `stripe_invoice_id`-ja, viszont kell hozzá fizetési mód,
-- esedékesség és egy jegyzet, hogy fél év múlva is tudd, mi volt ez.
--
-- A `due_date` az, amiből a fizetési emlékeztető dolgozik: a `pending` sor a
-- VÁRT befizetés, nem a megtörtént.

alter table public.subscription_payments
  add column if not exists payment_method text,
  add column if not exists due_date timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists note text,
  add column if not exists recorded_by uuid references auth.users(id) on delete set null;

alter table public.subscription_payments drop constraint if exists subscription_payments_payment_method_check;
alter table public.subscription_payments add constraint subscription_payments_payment_method_check
  check (payment_method is null or payment_method in ('stripe', 'bank_transfer'));

comment on column public.subscription_payments.due_date is
  'Mikor esedékes a befizetés. A pending státuszú sor a VÁRT fizetés; ebből dolgozik az emlékeztető.';
comment on column public.subscription_payments.reminder_sent_at is
  'Mikor ment ki az utolsó fizetési emlékeztető erre a sorra. Egy esedékességhez egy emlékeztető.';

create index if not exists subscription_payments_due_idx
  on public.subscription_payments(due_date)
  where status = 'pending';

-- ── 4. Az ügyfél lássa a saját befizetéseit ─────────────────────────────
--
-- A `Clients view own subscription payments` policy (020) már engedi az
-- olvasást, de a GRANT hiányzott hozzá: a 022-es hardening csak `authenticated`
-- szerepnek adott jogot, a tábla viszont az ügyfélkapun soha nem jelent meg.
-- Innentől megjelenik — a fizetési előzmény és a számlaszám az ügyfélé.

grant select on public.subscription_payments to authenticated;

-- ── 5. Halott táblák eltávolítása ───────────────────────────────────────
--
-- A 001-es migráció `clients`, `projects` és `portfolio_items` táblái SOHA nem
-- kaptak kódot: a valódi ügyféladat a `client_profiles` / `client_projects`
-- párban él, a referenciák pedig a `lib/works.ts`-ben. Két, egymásra
-- megtévesztően hasonlító tábla-készlet volt egyszerre a sémában, ami minden
-- lekérdezésnél kérdést szült, hogy most melyik az igazi.
--
-- A `quote_requests` és az `admin_users` a 001-ből MARAD: azokat használjuk.
--
-- A törlés SZÁNDÉKOSAN feltételes. Kód ugyan nem írt ezekbe a táblákba, de
-- kézzel bármikor kerülhetett beléjük sor a Supabase felületén, és egy
-- migráció nem dobhat el adatot csak azért, mert a kód nem ismeri. Ha van
-- bennük bármi, a tábla marad, és a notice megmondja, mit kell megnézni.

do $projectedge_drop_dead_tables$
declare
  target text;
  row_count bigint;
begin
  foreach target in array array['portfolio_items', 'projects', 'clients'] loop
    if to_regclass(format('public.%I', target)) is null then
      continue;
    end if;

    execute format('select count(*) from public.%I', target) into row_count;

    if row_count = 0 then
      execute format('drop table public.%I cascade', target);
      raise notice 'A(z) public.% halott tábla üres volt, eltávolítva.', target;
    else
      raise warning 'A(z) public.% tábla % sort tartalmaz, ezért NEM lett eltávolítva. Nézd meg kézzel, mi van benne.', target, row_count;
    end if;
  end loop;
end;
$projectedge_drop_dead_tables$;

-- ── 6. Realtime: a hiányzó táblák ───────────────────────────────────────
--
-- Az admin felület eddig azért nem látszott élőnek, mert a legfontosabb
-- táblák nem voltak a publikációban. Egy új ajánlatkérés vagy egy beérkezett
-- vásárlási igény sosem jelent meg magától — csak kézi frissítésre.

alter table public.quote_requests replica identity full;
alter table public.website_purchases replica identity full;
alter table public.brief_drafts replica identity full;
alter table public.change_request_messages replica identity full;
alter table public.subscription_payments replica identity full;

do $projectedge_realtime_038$
declare
  target text;
begin
  foreach target in array array[
    'quote_requests',
    'website_purchases',
    'brief_drafts',
    'change_request_messages'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target);
    end if;
  end loop;
end;
$projectedge_realtime_038$;

notify pgrst, 'reload schema';
