-- 050_site_daily_uptime.sql
--
-- Napi bontású elérhetőség az állapotjelentés sávjához (049): a negyedév
-- minden napjára hány mérés volt, és ebből hány sikertelen. Budapesti
-- naptári napra csoportosít, mert az ügyfél ebben gondolkodik.
--
-- Csak a szerver hívja (service role); ugyanaz a jogosultsági rend, mint a
-- `site_uptime_summary`-nál (046).

create or replace function public.site_daily_uptime(
  target_project uuid,
  period_start timestamptz,
  period_end timestamptz
)
returns table (
  day date,
  checks integer,
  failures integer
)
language sql
stable
security definer
set search_path = public
as $projectedge_daily$
  select
    (checked_at at time zone 'Europe/Budapest')::date as day,
    count(*)::integer as checks,
    count(*) filter (where not ok)::integer as failures
  from public.site_checks
  where project_id = target_project
    and checked_at >= period_start
    and checked_at < period_end
  group by 1
  order by 1;
$projectedge_daily$;

revoke all on function public.site_daily_uptime(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.site_daily_uptime(uuid, timestamptz, timestamptz) to authenticated;
