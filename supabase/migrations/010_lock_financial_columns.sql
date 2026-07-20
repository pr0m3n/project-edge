-- 010_lock_financial_columns.sql
--
-- FONTOS – EZT A VALÓS FIZETÉSSEL EGYÜTT ALKALMAZD:
-- Ez a migráció megakadályozza, hogy egy bejelentkezett ügyfél (nem admin) a
-- böngészőből átírja az ár-, foglaló-, fizetési- és szerződés-mezőket a
-- client_projects táblában. Ezeket a mezőket csak admin, illetve a szerver
-- oldali folyamat (Stripe webhook / API route service role kulccsal) módosíthatja.
--
-- A jelenlegi (mock) fizetés a ClientPortal.tsx-ben ezeket a mezőket még a
-- kliensből írja (acceptOffer / acceptContract / payDeposit / payFinal).
-- Ezért ezt a migrációt CSAK AKKOR futtasd le, amikor a fenti státusz-
-- átmeneteket már szerver oldalra mozgattad — különben a mock fizetés elbukik
-- a lenti kivétel miatt.

create or replace function public.guard_client_project_financials()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin mindent módosíthat.
  if public.is_admin() then
    return new;
  end if;

  -- Nem-admin (ügyfél) nem módosíthatja a pénzügyi / szerződés mezőket.
  if new.offer_price is distinct from old.offer_price
     or new.deposit_amount is distinct from old.deposit_amount
     or new.payment_status is distinct from old.payment_status
     or new.final_payment_paid is distinct from old.final_payment_paid
     or new.final_payment_paid_at is distinct from old.final_payment_paid_at
     or new.contract_accepted is distinct from old.contract_accepted
     or new.contract_accepted_at is distinct from old.contract_accepted_at then
    raise exception 'Az ár-, fizetési- és szerződés-mezők csak szerver oldalról módosíthatók.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_client_project_financials on public.client_projects;
create trigger guard_client_project_financials
  before update on public.client_projects
  for each row execute function public.guard_client_project_financials();

notify pgrst, 'reload schema';
