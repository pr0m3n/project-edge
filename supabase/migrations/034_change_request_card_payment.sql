-- 034_change_request_card_payment.sql
--
-- A kereten felüli módosítási és új funkció kérések ugyanúgy fizethetők, mint
-- a weboldal tulajdonba vétele: banki átutalással vagy Stripe bankkártyával.
-- A technikai hibák nem kapnak ajánlatot és továbbra is díjmentesek.

alter table public.change_requests
  add column if not exists payment_method text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

alter table public.change_requests drop constraint if exists change_requests_payment_method_check;
alter table public.change_requests add constraint change_requests_payment_method_check
  check (payment_method is null or payment_method in ('card', 'bank_transfer'));

create unique index if not exists change_requests_stripe_checkout_session_uidx
  on public.change_requests(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Az ügyfél továbbra sem írhat pénzügyi vagy Stripe-mezőket közvetlenül.
create or replace function public.guard_change_request_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;

  if tg_op = 'INSERT' then
    if new.user_id <> auth.uid() then
      raise exception 'Más nevében nem küldhető kérés.';
    end if;
    new.quoted_amount := null;
    new.payment_reference := null;
    new.transfer_reported_at := null;
    new.paid_at := null;
    new.quote_accepted_at := null;
    new.quote_note := null;
    new.payment_method := null;
    new.stripe_checkout_session_id := null;
    new.stripe_payment_intent_id := null;
    new.included_in_plan := null;
    new.admin_note := null;
    new.status := 'new';
    return new;
  end if;

  if old.user_id <> auth.uid() then
    raise exception 'Nem a saját kérésed.';
  end if;
  if new.quoted_amount is distinct from old.quoted_amount
    or new.payment_reference is distinct from old.payment_reference
    or new.paid_at is distinct from old.paid_at
    or new.transfer_reported_at is distinct from old.transfer_reported_at
    or new.quote_accepted_at is distinct from old.quote_accepted_at
    or new.quote_note is distinct from old.quote_note
    or new.payment_method is distinct from old.payment_method
    or new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id
    or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
    or new.included_in_plan is distinct from old.included_in_plan
    or new.admin_note is distinct from old.admin_note
    or new.status is distinct from old.status
    or new.category is distinct from old.category
    or new.project_id is distinct from old.project_id
  then
    raise exception 'Ezt a mezőt csak a szolgáltató módosíthatja.';
  end if;
  return new;
end;
$$;

create or replace function public.set_change_request_payment_method(
  request_id uuid,
  p_payment_method text
)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.change_requests%rowtype;
begin
  if p_payment_method not in ('card', 'bank_transfer') then
    raise exception 'Érvénytelen fizetési mód.';
  end if;

  update public.change_requests request
  set payment_method = p_payment_method
  where request.id = request_id
    and request.user_id = auth.uid()
    and request.status = 'waiting_client'
    and request.quoted_amount is not null
    and request.quote_accepted_at is not null
    and request.paid_at is null
    and request.transfer_reported_at is null
  returning * into result;

  if result.id is null then
    raise exception 'Ehhez a módosításhoz most nem választható fizetési mód.';
  end if;
  return result;
end;
$$;

-- A meglévő utalásjelzés most már csak banki fizetésnél használható.
create or replace function public.report_change_transfer(request_id uuid)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.change_requests%rowtype;
begin
  update public.change_requests request
  set transfer_reported_at = now(), payment_method = 'bank_transfer'
  where request.id = request_id
    and request.user_id = auth.uid()
    and request.status = 'waiting_client'
    and request.quote_accepted_at is not null
    and request.payment_method = 'bank_transfer'
    and request.transfer_reported_at is null
    and request.paid_at is null
    and left(request.description, length('[WEBOLDAL_MEGVASARLAS]')) <> '[WEBOLDAL_MEGVASARLAS]'
  returning * into result;

  if result.id is null then
    raise exception 'Az utalás ennél a kérésnél nem jelezhető.';
  end if;
  return result;
end;
$$;

create or replace function public.confirm_change_payment(request_id uuid)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.change_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Nincs admin jogosultság.'; end if;

  update public.change_requests request
  set paid_at = now(), status = 'in_progress'
  where request.id = request_id
    and request.status = 'waiting_client'
    and request.quoted_amount is not null
    and request.payment_method = 'bank_transfer'
    and request.transfer_reported_at is not null
    and request.paid_at is null
  returning * into result;

  if result.id is null then
    raise exception 'A módosítás fizetése még nem igazolható.';
  end if;
  return result;
end;
$$;

revoke all on function public.set_change_request_payment_method(uuid, text) from public, anon;
revoke all on function public.report_change_transfer(uuid) from public, anon;
revoke all on function public.confirm_change_payment(uuid) from public, anon;
grant execute on function public.set_change_request_payment_method(uuid, text) to authenticated;
grant execute on function public.report_change_transfer(uuid) to authenticated;
grant execute on function public.confirm_change_payment(uuid) to authenticated;

notify pgrst, 'reload schema';
