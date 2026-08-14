-- A módosítási keret mérhetővé tétele.
--
-- Eddig a csomag „Havi 1 kisebb módosítás" ígérete csak egy szöveg volt: sem az
-- ügyfél, sem az admin nem látta, hány módosítás fogyott el az adott
-- időszakban, és a keret nem is tudott megújulni, mert a kéréshez nem tartozott
-- időszak.
--
-- A `period_key` az előfizetés FORDULÓNAPJÁHOZ igazodik, nem a naptári hónaphoz:
-- aki 17-én fizetett először, annak 17-én újul a kerete. Ugyanezt a szabályt
-- számolja a `lib/subscriptions.ts` `quotaPeriodKey()` függvénye — a kettőnek
-- egyeznie kell, különben az ügyfél mást lát, mint amit a rendszer számol.
--
-- Az értéket TRIGGER állítja be, nem a kliens: az RLS insert policy megengedi,
-- hogy az ügyfél maga szúrjon be sort, tehát ha a `period_key` a beküldött
-- adatból jönne, egy régi időszak megadásával korlátlan keretet lehetne
-- szerezni.

alter table public.change_requests
  add column if not exists period_key text;

create or replace function public.set_change_request_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  anchor timestamptz;
  plan text;
  anchor_day int;
  days_in_month int;
  effective_day int;
  elapsed int;
begin
  select
    coalesce(p.billing_cycle_started_at, p.subscription_started_at, p.created_at),
    p.subscription_plan
  into anchor, plan
  from public.client_projects p
  where p.id = new.project_id;

  if anchor is null then
    new.period_key := 'M0';
    return new;
  end if;

  anchor_day := extract(day from anchor)::int;
  days_in_month := extract(day from (date_trunc('month', now()) + interval '1 month - 1 day'))::int;
  effective_day := least(anchor_day, days_in_month);

  -- A Jelenlét csomag kerete éves, a többié havi.
  if plan = 'presence' then
    elapsed := extract(year from now())::int - extract(year from anchor)::int;
    if extract(month from now())::int < extract(month from anchor)::int
      or (extract(month from now())::int = extract(month from anchor)::int
          and extract(day from now())::int < effective_day) then
      elapsed := elapsed - 1;
    end if;
    new.period_key := 'Y' || greatest(0, elapsed)::text;
  else
    elapsed := (extract(year from now())::int - extract(year from anchor)::int) * 12
             + (extract(month from now())::int - extract(month from anchor)::int);
    if extract(day from now())::int < effective_day then
      elapsed := elapsed - 1;
    end if;
    new.period_key := 'M' || greatest(0, elapsed)::text;
  end if;

  return new;
end;
$$;

drop trigger if exists change_requests_set_period on public.change_requests;
create trigger change_requests_set_period
  before insert on public.change_requests
  for each row execute function public.set_change_request_period();

-- A meglévő kérések visszamenőleg az "első időszakba" kerülnek. Ezek jellemzően
-- már lezárt ügyek; a cél csak az, hogy ne maradjon null érték.
update public.change_requests
set period_key = 'M0'
where period_key is null;

create index if not exists change_requests_period_idx
  on public.change_requests(project_id, period_key);

notify pgrst, 'reload schema';
