-- 027_stripe_lifecycle_fixes.sql
--
-- 1. A 025 megtörte az egyszeri (purchase) projektindítást.
--
--    A 021-es változat így nézett ki:
--
--      if tg_op = 'INSERT' then
--        if new.commercial_model = 'subscription' then ... end if;
--        return new;                      -- MINDEN insert itt tért vissza
--      end if;
--
--    A 025 ezt `if tg_op = 'INSERT' and new.commercial_model = 'subscription'`
--    alakra írta át, így egy `purchase` modellű INSERT átesik a lenti,
--    `old.*` mezőket összehasonlító blokkba. BEFORE INSERT triggerben az OLD
--    nincs hozzárendelve, tehát a mező olvasása hibát dob:
--      record "old" is not assigned yet
--    Ennek következtében bejelentkezett ügyfél egyáltalán nem tudott egyszeri
--    projektet indítani ("Nem sikerült elindítani a projektet").
--
--    Itt visszaállítjuk a 021-es szerkezetet, megtartva a 025 árait.
--
-- 2. A 020-ban létrehozott két tábla kimaradt a realtime publikációból, ezért
--    az admin `change_requests` feliratkozása soha nem sült el.

create or replace function public.guard_managed_website_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_monthly integer;
  expected_purchase integer;
  allowed_subscription_transition boolean;
begin
  if public.is_admin() or auth.uid() is null then return new; end if;

  -- FONTOS: minden INSERT ezen az ágon tér vissza. Az OLD-ra hivatkozó
  -- ellenőrzések csak UPDATE-nél futhatnak.
  if tg_op = 'INSERT' then
    if new.commercial_model = 'subscription' then
      expected_monthly := case new.subscription_plan
        when 'presence' then 14900 when 'business' then 24900 when 'custom' then 39900 else null end;
      expected_purchase := case new.subscription_plan
        when 'presence' then 179000 when 'business' then 329000 when 'custom' then 599000 else null end;
      if expected_monthly is null
         or new.monthly_price is distinct from expected_monthly
         or new.deposit_amount is distinct from expected_monthly
         or new.offer_price is distinct from expected_monthly
         or new.purchase_option_price is distinct from expected_purchase
         or new.subscription_status is distinct from 'agreement_pending'
         or new.status is distinct from 'contract_pending' then
        raise exception 'Érvénytelen menedzselt csomag vagy díj.';
      end if;
    end if;
    return new;
  end if;

  if new.commercial_model is distinct from old.commercial_model
     or new.subscription_plan is distinct from old.subscription_plan
     or new.monthly_price is distinct from old.monthly_price
     or new.purchase_option_price is distinct from old.purchase_option_price
     or new.billing_cycle_started_at is distinct from old.billing_cycle_started_at
     or new.next_billing_at is distinct from old.next_billing_at
     or new.paused_at is distinct from old.paused_at
     or new.cancel_effective_at is distinct from old.cancel_effective_at
     or new.cancelled_at is distinct from old.cancelled_at
     or new.managed_domain_name is distinct from old.managed_domain_name
     or new.domain_registered_at is distinct from old.domain_registered_at
     or new.domain_renewal_at is distinct from old.domain_renewal_at
     or new.domain_status is distinct from old.domain_status
     or new.domain_transfer_requested_at is distinct from old.domain_transfer_requested_at
     or new.site_health_status is distinct from old.site_health_status
     or new.last_health_check_at is distinct from old.last_health_check_at then
    raise exception 'A csomag, díj és technikai állapot csak a szolgáltató oldaláról módosítható.';
  end if;

  if new.subscription_status is distinct from old.subscription_status then
    allowed_subscription_transition := (
      (old.subscription_status = 'agreement_pending' and new.subscription_status = 'first_payment_pending')
      or (old.subscription_status = 'active' and new.subscription_status in ('pause_requested', 'cancel_requested'))
      or (old.subscription_status = 'paused' and new.subscription_status in ('resume_requested', 'cancel_requested'))
    );
    if not allowed_subscription_transition then
      raise exception 'Ezt az előfizetési állapotot csak a szolgáltató módosíthatja.';
    end if;
  end if;

  if new.pause_requested_at is distinct from old.pause_requested_at and new.subscription_status <> 'pause_requested' then
    raise exception 'Érvénytelen szüneteltetési kérelem.';
  end if;
  if new.resume_requested_at is distinct from old.resume_requested_at and new.subscription_status <> 'resume_requested' then
    raise exception 'Érvénytelen újraaktiválási kérelem.';
  end if;
  if new.subscription_cancel_requested_at is distinct from old.subscription_cancel_requested_at and new.subscription_status <> 'cancel_requested' then
    raise exception 'Érvénytelen lemondási kérelem.';
  end if;
  return new;
end;
$$;

-- A 020-ban létrehozott táblák realtime publikációja.
do $projectedge_realtime_020$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'change_requests'
  ) then
    alter publication supabase_realtime add table public.change_requests;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'subscription_payments'
  ) then
    alter publication supabase_realtime add table public.subscription_payments;
  end if;
end;
$projectedge_realtime_020$;

-- A szüneteltetés Stripe-oldali parkolási díjának nyilvántartása. A havidíj
-- (`monthly_price`) változatlan marad — ez csak azt rögzíti, hogy éppen a
-- parkolási áron fut-e az előfizetés, hogy az újraaktiválás vissza tudja
-- állítani a csomagárat.
alter table public.client_projects
  add column if not exists stripe_parked_at timestamptz;

-- A 026-os guardot kiterjesztjük az új oszlopra is, hogy a böngészőből ne
-- lehessen "parkolt" állapotot hazudni.
create or replace function public.guard_stripe_billing_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.stripe_customer_id is not null or new.stripe_subscription_id is not null
       or new.stripe_checkout_session_id is not null or new.stripe_subscription_status is not null
       or new.stripe_current_period_end is not null or new.stripe_parked_at is not null then
      raise exception 'A fizetési szolgáltató adatai csak szerveroldalon írhatók.';
    end if;
  elsif new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id
     or new.stripe_subscription_status is distinct from old.stripe_subscription_status
     or new.stripe_current_period_end is distinct from old.stripe_current_period_end
     or new.stripe_parked_at is distinct from old.stripe_parked_at then
    raise exception 'A fizetési szolgáltató adatai csak szerveroldalon írhatók.';
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
