-- 039_site_monitoring.sql
--
-- VALÓDI MÉRÉS a havi ügyfél-jelentéshez.
--
-- Az `/api/reports/monthly` eddig beégetett számokat küldött ki: „99.98%
-- rendelkezésre állás", „165 ms válaszidő", „napi automatikus mentés rendben".
-- Ezek mögött SEMMILYEN mérés nem állt — a szövegben szerepeltek, kódként.
-- Amíg nem volt aktív előfizető, ez nem okozott kárt; egy fizető ügyfélnek
-- viszont havonta kiküldeni kitalált műszaki adatokat más kategória.
--
-- Ez a migráció adja az alapot ahhoz, hogy a jelentés IGAZ legyen:
-- rendszeresen megnézzük, hogy az oldal él-e és milyen gyorsan válaszol, és
-- eltároljuk, amit tényleg mértünk. A rendelkezésre állás így nem becslés,
-- hanem számolható tény — a levél pedig mindig kiírja, hány mérésből.
--
-- A mérés gyakoriságát a Vercel csomag korlátozza (Hobby: napi egy futás).
-- A séma ettől független: bármilyen sűrűségű mérést elbír, és a
-- `site_uptime_summary` a tényleges mérésszámmal oszt.
--
-- Amit szándékosan NEM mérünk: látogatószámot. Egy induló oldalnál az kevés
-- lesz, és egy alacsony szám havonta kiküldve a szolgáltatás ellen dolgozik.
-- Az itt tárolt adatok viszont az első naptól jól néznek ki, mert a
-- szolgáltatás minőségéről szólnak, nem a marketing eredményéről.

create table if not exists public.site_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  checked_at timestamptz not null default now(),
  /** Elérhető volt-e: 2xx vagy 3xx válasz időben. */
  ok boolean not null,
  status_code integer,
  /** A válasz első bájtjáig eltelt idő ezredmásodpercben. */
  response_ms integer,
  /** Hibaszöveg, ha nem volt elérhető. Diagnosztikához, nem az ügyfélnek. */
  error text
);

comment on table public.site_checks is
  'Óránkénti elérhetőség-mérés ügyfélweboldalanként. Ebből számolódik a havi jelentés rendelkezésre állása — becslés helyett tényből.';

create index if not exists site_checks_project_time_idx
  on public.site_checks(project_id, checked_at desc);

-- ── A legutóbbi állapot és a havi mérőszámok a projekten ────────────────
--
-- A `site_health_status` és a `last_health_check_at` már létezik (020), de
-- eddig SEMMI nem írta őket: az ügyfélkapun az „Utolsó ellenőrzés" csempe
-- örökre „Induláskor" maradt. Innentől a cron tölti fel.

alter table public.client_projects
  add column if not exists ssl_expires_at timestamptz,
  add column if not exists domain_expires_at timestamptz,
  /** A legutóbbi PageSpeed Insights mérés eredménye (0–100). */
  add column if not exists psi_performance integer,
  add column if not exists psi_accessibility integer,
  add column if not exists psi_seo integer,
  add column if not exists psi_checked_at timestamptz;

comment on column public.client_projects.psi_performance is
  'PageSpeed Insights sebességpontszám. Havonta frissül; ez az a szám, ami az ügyfélnek is mond valamit.';

-- ── Havi összesítő ──────────────────────────────────────────────────────
--
-- Függvényben, nem a route-ban: a rendelkezésre állás kiszámítása egyetlen
-- helyen éljen, különben a jelentés és az ügyfélkapu előbb-utóbb más számot
-- mutatna ugyanarról a hónapról.

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
      -- Két tizedesjegy: a 99.98% és a 99.9% között valódi különbség van,
      -- a további jegyek viszont már csak pontosságot színlelnének.
      else round(100.0 * count(*) filter (where ok) / count(*), 2)
    end as uptime_percent,
    avg(response_ms) filter (where ok)::integer as avg_response_ms,
    max(response_ms) filter (where ok)::integer as worst_response_ms,
    max(checked_at) filter (where not ok) as last_failure_at
  from public.site_checks
  where project_id = target_project
    and checked_at >= period_start
    and checked_at < period_end;
$projectedge_uptime$;

-- ── Jogosultságok ───────────────────────────────────────────────────────
--
-- A méréseket a cron írja (service role). Az ügyfél a SAJÁT oldalának
-- méréseit olvashatja — ez az ő szolgáltatásának a teljesítménye.

alter table public.site_checks enable row level security;
revoke all on public.site_checks from anon;
grant select on public.site_checks to authenticated;

drop policy if exists "Participants read site checks" on public.site_checks;
create policy "Participants read site checks"
on public.site_checks for select
to authenticated
using (
  exists (
    select 1 from public.client_projects p
    where p.id = site_checks.project_id
      and (p.user_id = auth.uid() or public.is_admin())
  )
);

revoke all on function public.site_uptime_summary(uuid, timestamptz, timestamptz) from anon;
grant execute on function public.site_uptime_summary(uuid, timestamptz, timestamptz) to authenticated;

-- ── Takarítás ───────────────────────────────────────────────────────────
--
-- Még óránkénti mérésnél is csak évi ~8 760 sor ügyfelenként. Ez önmagában
-- kevés, de korlátlanul nőne. A 18 hónapnál régebbi mérésre nincs szükség: a havi
-- jelentés az előző hónapból dolgozik, az éves összefoglaló 12 hónapból.

create or replace function public.prune_site_checks()
returns integer
language plpgsql
security definer
set search_path = public
as $projectedge_prune$
declare
  removed integer;
begin
  delete from public.site_checks where checked_at < now() - interval '18 months';
  get diagnostics removed = row_count;
  return removed;
end;
$projectedge_prune$;

notify pgrst, 'reload schema';
