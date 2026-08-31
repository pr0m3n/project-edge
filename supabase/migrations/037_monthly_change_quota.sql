-- A módosítási keret MINDEN csomagnál HAVI.
--
-- Eddig a `031` migráció a `presence` csomagot évesként kezelte, miközben az
-- oldal és a `lib/subscriptions.ts` egyaránt „Havi 1 kisebb módosítás"-t
-- ígért: egy Jelenlét-ügyfél az első módosítás után az év hátralévő részére
-- elfogyott volna. Az ígéret marad, a számítás igazodik hozzá.
--
-- A VÉTELÁR NEM VÁLTOZIK (179 000 / 329 000 / 599 000), ezért a
-- `guard_managed_website_writes` triggerhez ebben a menetben nem kell nyúlni.
-- A rent-to-own beszámítás tisztán alkalmazásoldali: a tárolt
-- `purchase_option_price` marad a listaár, a ténylegesen fizetendő összeget a
-- `lib/subscriptions.ts` `buyoutPrice()` számolja a befizetett hónapokból.
-- HA VALAHA ÁRAT ÍRSZ a `PURCHASE_OPTION_PRICES`-ban, a guardot is migrálni
-- kell, különben minden új előfizetés-beküldés elhasal.

-- A fordulónap-szabály változatlan, csak a `presence` éves ága tűnik el —
-- ugyanaz marad, amit a `lib/subscriptions.ts` `elapsedBillingMonths()` számol.
create or replace function public.set_change_request_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  anchor timestamptz;
  anchor_day int;
  days_in_month int;
  effective_day int;
  elapsed int;
begin
  select coalesce(p.billing_cycle_started_at, p.subscription_started_at, p.created_at)
  into anchor
  from public.client_projects p
  where p.id = new.project_id;

  if anchor is null then
    new.period_key := 'M0';
    return new;
  end if;

  anchor_day := extract(day from anchor)::int;
  days_in_month := extract(day from (date_trunc('month', now()) + interval '1 month - 1 day'))::int;
  effective_day := least(anchor_day, days_in_month);

  elapsed := (extract(year from now())::int - extract(year from anchor)::int) * 12
           + (extract(month from now())::int - extract(month from anchor)::int);
  if extract(day from now())::int < effective_day then
    elapsed := elapsed - 1;
  end if;

  new.period_key := 'M' || greatest(0, elapsed)::text;
  return new;
end;
$$;

-- A korábbi éves kulccsal ('Y…') rögzített Jelenlét-kérések átsorolása. Az
-- 'Y0' az első időszak volt, ennek a havi megfelelője az 'M0'. Ennél
-- pontosabb visszamenőleges átszámítás nem lehetséges, mert a kérés
-- beérkezésekor érvényes fordulónap már nincs meg — és nem is fontos: az
-- átsorolás iránya az ügyfélnek KEDVEZ (felszabadul a kerete).
update public.change_requests
set period_key = 'M' || substring(period_key from 2)
where period_key like 'Y%';

notify pgrst, 'reload schema';
