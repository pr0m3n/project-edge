-- 044_billing_terms.sql
--
-- FIZETÉSI ÜTEMEZÉS AZ ÜGYFÉLKAPUN.
--
-- Eddig a weboldalon keresztül érkező ügyfélnek egyetlen lehetősége volt:
-- havi díj, bankkártyával, automatikus megújulással. Aki fél évet vagy egy
-- évet szeretett volna előre fizetni — és sok kisvállalkozás pont így szeret —,
-- annak nem volt hova kattintania. Aki pedig utalni akart, annak végképp nem:
-- a rendszer csak Stripe-ot ismert.
--
-- A `billing_interval` (month|year) ehhez kevés, mert a féléves ciklus nem
-- fér bele. Ez az oszlop HÓNAPBAN tárolja a futamidőt, ami mindhárom esetet
-- kifejezi, és későbbi futamidőkhöz sem kell újra migrálni.
--
-- A `billing_interval` MEGMARAD, és a kód szinkronban tartja vele (1 és 6 →
-- month, 12 → year). Nem duplikáció: a Stripe ismétlődő terhelése `interval`
-- + `interval_count` párost vár, tehát ott továbbra is erre a formára van
-- szükség. A periódusszámítás viszont mostantól a hónapszámból dolgozik.

alter table public.client_projects
  add column if not exists billing_period_months integer not null default 1;

comment on column public.client_projects.billing_period_months is
  'A számlázási ciklus hossza hónapban (1 = havi, 6 = féléves, 12 = éves). Ez a periódusszámítás forrása; a billing_interval ebből származik a Stripe kedvéért.';

alter table public.client_projects drop constraint if exists client_projects_billing_period_months_check;
alter table public.client_projects add constraint client_projects_billing_period_months_check
  check (billing_period_months in (1, 3, 6, 12, 24));

-- A meglévő sorok igazítása: aki eddig éves ciklusú volt, az 12 hónapos.
update public.client_projects
set billing_period_months = 12
where billing_interval = 'year' and billing_period_months = 1;

-- ── Bejelentett utalás a havidíjra ──────────────────────────────────────
--
-- A `subscription_payments.status` már ismeri a `reported` értéket (020), de
-- eddig SEMMI nem állította be: a státusz a Stripe-ból jött, ahol nincs
-- „bejelentettem az utalást" állapot. Az ügyfélkapun mostantól az ügyfél
-- jelezheti, hogy elutalta — ettől kerül a sor `reported`-be, és ettől jelenik
-- meg az adminnál teendőként. Enélkül a pénz beérkezne a bankszámlára, és
-- senki nem tudná, hogy meg kell nézni.

alter table public.subscription_payments
  add column if not exists transfer_reported_at timestamptz;

comment on column public.subscription_payments.transfer_reported_at is
  'Mikor jelezte az ügyfél, hogy elutalta. A beérkezést ettől függetlenül az admin igazolja a bankszámlán.';

create index if not exists subscription_payments_reported_idx
  on public.subscription_payments(transfer_reported_at desc)
  where status = 'reported';

-- Az ügyfél a SAJÁT várt befizetését jelentheti be utaltnak — mást nem írhat.
-- A `status` és az összeg módosítását a szerveroldali útvonal végzi service
-- role kulccsal; ez a policy csak azt engedi, hogy a sor egyáltalán látszódjon
-- és a szerver a nevében dolgozhasson.
notify pgrst, 'reload schema';
