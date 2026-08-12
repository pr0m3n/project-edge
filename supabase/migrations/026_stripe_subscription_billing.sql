-- Stripe-előfizetések, webhook-idempotencia és Billingo számlakapcsolat.
alter table public.client_projects
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_current_period_end timestamptz;

create unique index if not exists client_projects_stripe_subscription_uidx
  on public.client_projects(stripe_subscription_id) where stripe_subscription_id is not null;

alter table public.client_projects drop constraint if exists client_projects_subscription_status_check;
alter table public.client_projects add constraint client_projects_subscription_status_check
  check (subscription_status is null or subscription_status in
    ('agreement_pending', 'first_payment_pending', 'active', 'past_due', 'pause_requested', 'paused', 'resume_requested', 'cancel_requested', 'cancelled'));

alter table public.subscription_payments
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists billingo_document_id integer,
  add column if not exists billingo_invoice_number text,
  add column if not exists billingo_error text,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists subscription_payments_stripe_invoice_uidx
  on public.subscription_payments(stripe_invoice_id);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;

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
       or new.stripe_current_period_end is not null then
      raise exception 'A fizetési szolgáltató adatai csak szerveroldalon írhatók.';
    end if;
  elsif new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.stripe_checkout_session_id is distinct from old.stripe_checkout_session_id
     or new.stripe_subscription_status is distinct from old.stripe_subscription_status
     or new.stripe_current_period_end is distinct from old.stripe_current_period_end then
    raise exception 'A fizetési szolgáltató adatai csak szerveroldalon írhatók.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_stripe_billing_fields_trigger on public.client_projects;
create trigger guard_stripe_billing_fields_trigger
before insert or update on public.client_projects
for each row execute function public.guard_stripe_billing_fields();

notify pgrst, 'reload schema';
