-- A menedzselt konstrukció ár- és infrastruktúra-mezőit a kliens nem írhatja át.
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
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.commercial_model = 'subscription' then
      expected_monthly := case new.subscription_plan
        when 'presence' then 19900
        when 'business' then 29900
        when 'custom' then 49900
        else null
      end;
      expected_purchase := case new.subscription_plan
        when 'presence' then 349000
        when 'business' then 649000
        when 'custom' then 990000
        else null
      end;
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

  if new.pause_requested_at is distinct from old.pause_requested_at
     and new.subscription_status <> 'pause_requested' then
    raise exception 'Érvénytelen szüneteltetési kérelem.';
  end if;
  if new.resume_requested_at is distinct from old.resume_requested_at
     and new.subscription_status <> 'resume_requested' then
    raise exception 'Érvénytelen újraaktiválási kérelem.';
  end if;
  if new.subscription_cancel_requested_at is distinct from old.subscription_cancel_requested_at
     and new.subscription_status <> 'cancel_requested' then
    raise exception 'Érvénytelen lemondási kérelem.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_managed_website_writes on public.client_projects;
create trigger guard_managed_website_writes
  before insert or update on public.client_projects
  for each row execute function public.guard_managed_website_writes();

notify pgrst, 'reload schema';
