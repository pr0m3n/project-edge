-- 028_durable_rate_limits.sql
--
-- A nyilvános végpontok korlátozása eddig egy memóriában tartott Map-ben élt
-- (`lib/api-guard.ts`). Vercelen minden lambda-példánynak SAJÁT memóriája van,
-- tehát az "5 ticket / 10 perc" valójában 5 × példányszám volt — terhelés
-- alatt, amikor a korlát számítana, automatikusan fel is skálázódott.
--
-- Ez a tábla és függvény adatbázisban számol, tehát a korlát a teljes
-- telepítésre érvényes. Csak a service role fér hozzá; a böngésző soha.

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create index if not exists rate_limits_reset_idx on public.rate_limits(reset_at);

/**
 * Egy kérés "elfogyasztása" az adott kulcson.
 *
 * Atomi: az `insert ... on conflict do update` egyetlen utasításban lépteti a
 * számlálót, tehát párhuzamos kérések sem tudják megkerülni a korlátot.
 * A lejárt ablak ugyanabban a lépésben nullázódik.
 */
create or replace function public.consume_rate_limit(
  limit_key text,
  max_count integer,
  window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.rate_limits%rowtype;
begin
  -- Alkalmi takarítás, hogy a tábla ne nőjön korlátlanul. Nem minden híváskor
  -- fut, mert az fölösleges írásterhelés lenne.
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now() - interval '1 day';
  end if;

  insert into public.rate_limits as existing (key, count, reset_at, updated_at)
  values (limit_key, 1, now() + make_interval(secs => window_seconds), now())
  on conflict (key) do update
    set count = case when existing.reset_at <= now() then 1 else existing.count + 1 end,
        reset_at = case
          when existing.reset_at <= now() then now() + make_interval(secs => window_seconds)
          else existing.reset_at
        end,
        updated_at = now()
  returning * into entry;

  return query
    select entry.count <= max_count,
           greatest(1, ceil(extract(epoch from (entry.reset_at - now())))::integer);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;

notify pgrst, 'reload schema';
