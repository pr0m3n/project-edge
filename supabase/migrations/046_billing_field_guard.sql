-- 046_billing_field_guard.sql
--
-- A 038–045 között felvett számlázási és üzemeltetési oszlopok lezárása az
-- ügyfél elől, és három kisebb jogosultsági rés betömése.
--
-- ── 1. Az ügyfél nem írhatja a saját díját ─────────────────────────────────
--
-- A `client_projects` RLS-e az ügyfélnek a SAJÁT sorát teljes egészében
-- írhatóvá teszi (003). A pénzügyi mezőket eddig két trigger védte
-- (`guard_client_project_writes`, `guard_managed_website_writes`), de egyikük
-- sem ismeri a 038 utáni oszlopokat. A következmény:
--
--   · `billing_amount`  — egy közvetlen REST-hívással `1000`-re állítva a
--                         Checkout ennyit terhelt volna ciklusonként;
--   · `billing_period_months` / `billing_interval` — a ciklus hossza, tehát
--                         hogy mennyi időre szól egy befizetés;
--   · `live_url`        — a monitor cron ezt kéri le szerveroldalról, tehát
--                         belső címre állítva SSRF-re volt használható;
--   · `prepaid_until`   — meddig van kifizetve (emlékeztető, próbaidő).
--
-- Külön triggerben, nem a meglévők bővítésével: azok a státuszgépet és a
-- csomagárakat is tartalmazzák, és egy átírás ott sokkal nagyobb kockázat,
-- mint egy új, önálló ellenőrzés.
--
-- Az admin és a service role (a szerveroldali útvonalak: Checkout, utalás,
-- ügyfélfelvétel, webhook) továbbra is mindent írhat.

create or replace function public.guard_client_billing_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;

  -- Új projektnél a mezők csak az alapértékükkel jöhetnek létre.
  if tg_op = 'INSERT' then
    if new.billing_amount is not null
       or new.billing_period_months is distinct from 1
       or new.billing_interval is distinct from 'month'
       or new.prepaid_until is not null
       or new.live_url is not null
       or new.origin is distinct from 'portal'
       or new.onboarded_at is not null
       or new.onboarded_by is not null then
      raise exception 'Ez a mező csak a szolgáltató oldaláról állítható be.';
    end if;
    return new;
  end if;

  if new.billing_amount is distinct from old.billing_amount
     or new.billing_period_months is distinct from old.billing_period_months
     or new.billing_interval is distinct from old.billing_interval
     or new.prepaid_until is distinct from old.prepaid_until
     or new.payment_method is distinct from old.payment_method
     or new.live_url is distinct from old.live_url
     or new.origin is distinct from old.origin
     or new.onboarded_at is distinct from old.onboarded_at
     or new.onboarded_by is distinct from old.onboarded_by
     or new.ssl_expires_at is distinct from old.ssl_expires_at
     or new.domain_expires_at is distinct from old.domain_expires_at
     or new.psi_performance is distinct from old.psi_performance
     or new.psi_accessibility is distinct from old.psi_accessibility
     or new.psi_seo is distinct from old.psi_seo
     or new.psi_checked_at is distinct from old.psi_checked_at
     or new.anniversary_email_sent_at is distinct from old.anniversary_email_sent_at then
    raise exception 'Ez a mező csak a szolgáltató oldaláról módosítható.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_client_billing_fields on public.client_projects;
create trigger guard_client_billing_fields
  before insert or update on public.client_projects
  for each row execute function public.guard_client_billing_fields();

-- ── 2. A Stripe-webhook kétfázisú idempotenciája ───────────────────────────
--
-- `processed_at` eddig a FOGLALÁS ideje volt. Mellé kerül a BEFEJEZÉS: a
-- duplikált kézbesítés csak akkor kap „kész" választ, ha az első példány
-- tényleg végzett, különben 409-et, és a Stripe később újrapróbálja.
--
-- Az alapérték szándékosan `now()`: a még élő, régi kód nem ismeri az
-- oszlopot, és az általa beírt sorok MÁR feldolgozott eseményeket jelölnek
-- (hibánál a régi kód is törli a sort). Az új kód a foglaláskor kifejezetten
-- `null`-t ír bele.

alter table public.stripe_webhook_events
  add column if not exists completed_at timestamptz default now();

update public.stripe_webhook_events
set completed_at = processed_at
where completed_at is null;

-- ── 3. Uptime-összesítő csak a saját projektre ─────────────────────────────
--
-- A security definer függvény megkerüli a `site_checks` RLS-ét, tehát a
-- tulajdonosi ellenőrzésnek a függvényben kell lennie. Eddig bármely
-- bejelentkezett ügyfél lekérhette egy másik projekt számait, ha tudta az
-- azonosítóját. A service role (`auth.uid()` üres: a havi jelentés cronja)
-- továbbra is minden projektet lát.

create or replace function public.site_uptime_summary(
  target_project uuid,
  period_start timestamptz,
  period_end timestamptz
)
returns table (
  checks integer,
  failures integer,
  uptime_percent numeric,
  avg_response_ms integer,
  worst_response_ms integer,
  last_failure_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $projectedge_uptime$
  select
    count(*)::integer as checks,
    count(*) filter (where not ok)::integer as failures,
    case
      when count(*) = 0 then null
      else round(100.0 * count(*) filter (where ok) / count(*), 2)
    end as uptime_percent,
    avg(response_ms) filter (where ok)::integer as avg_response_ms,
    max(response_ms) filter (where ok)::integer as worst_response_ms,
    max(checked_at) filter (where not ok) as last_failure_at
  from public.site_checks
  where project_id = target_project
    and checked_at >= period_start
    and checked_at < period_end
    and (
      auth.uid() is null
      or public.is_admin()
      or exists (
        select 1 from public.client_projects p
        where p.id = target_project and p.user_id = auth.uid()
      )
    );
$projectedge_uptime$;

revoke all on function public.site_uptime_summary(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.site_uptime_summary(uuid, timestamptz, timestamptz) to authenticated;

-- ── 4. A takarítás csak a szerveré ─────────────────────────────────────────
--
-- A Postgres a függvényeket alapból MINDENKINEK futtathatóvá teszi. A 039
-- ezt nem vonta vissza, tehát egy anonim REST-hívás is lefuttathatta a
-- törlést.

revoke all on function public.prune_site_checks() from public, anon, authenticated;

-- ── 5. Az utalásjelzés csak a saját vásárlást adja vissza ──────────────────
--
-- A 033-as RPC az UPDATE-et a tulajdonoshoz kötötte, de utána tulajdonosi
-- feltétel NÉLKÜL olvasta vissza a sort. Egy másik ügyfél már jelzett
-- vásárlásának azonosítójával így annak teljes rekordja (számlázási adatok)
-- lekérhető volt.

create or replace function public.report_website_purchase_transfer_v2(p_purchase_id uuid)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.website_purchases%rowtype;
begin
  update public.website_purchases
  set transfer_reported_at = now(),
      payment_status = 'reported',
      status = 'transfer_reported'
  where id = p_purchase_id
    and user_id = auth.uid()
    and payment_method = 'bank_transfer'
    and status = 'payment_pending'
    and payment_status = 'unpaid';

  select * into result
  from public.website_purchases
  where id = p_purchase_id
    and user_id = auth.uid();

  if result.id is null or result.status <> 'transfer_reported' then
    raise exception 'Az átutalás ennél a tulajdonba vételnél most nem jelezhető.';
  end if;
  return result;
end;
$$;

revoke all on function public.report_website_purchase_transfer_v2(uuid) from public, anon;
grant execute on function public.report_website_purchase_transfer_v2(uuid) to authenticated;

notify pgrst, 'reload schema';
