-- Versenyhelyzet-biztos kivásárlás és ellenőrizhető banki utalási folyamat.

alter table public.change_requests
  add column if not exists quoted_amount integer,
  add column if not exists payment_reference text,
  add column if not exists transfer_reported_at timestamptz,
  add column if not exists paid_at timestamptz;

create or replace function public.guard_client_project_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.user_id <> auth.uid() then raise exception 'Más felhasználó nevében nem indítható projekt.'; end if;
  if new.commercial_model = 'purchase' and (
    new.status <> 'request_received'
    or new.offer_status <> 'draft'
    or new.offer_price is not null
    or new.deposit_amount is not null
    or new.payment_status <> 'unpaid'
    or new.contract_accepted
    or new.final_payment_paid
    or new.admin_notes is not null
    or new.staging_url is not null
    or new.warranty_started_at is not null
    or new.warranty_expires_at is not null
    or new.subscription_plan is not null
    or new.subscription_status is not null
    or new.monthly_price is not null
    or new.purchase_option_price is not null
  ) then
    raise exception 'Érvénytelen projektindító állapot.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_client_project_insert on public.client_projects;
create trigger guard_client_project_insert
before insert on public.client_projects
for each row execute function public.guard_client_project_insert();

-- Korábbi duplikáció esetén a legújabb marad aktív.
with ranked as (
  select id, row_number() over (partition by project_id order by requested_at desc, id desc) as position
  from public.change_requests
  where left(description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
    and status not in ('completed', 'declined')
)
update public.change_requests request
set status = 'declined',
    admin_note = coalesce(request.admin_note, 'Automatikusan lezárt korábbi, duplikált megvásárlási igény.'),
    completed_at = coalesce(request.completed_at, now())
from ranked
where request.id = ranked.id and ranked.position > 1;

drop trigger if exists guard_duplicate_website_purchase_request on public.change_requests;
drop function if exists public.guard_duplicate_website_purchase_request();

create unique index if not exists one_active_website_purchase_per_project
on public.change_requests(project_id)
where left(description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
  and status not in ('completed', 'declined');

create or replace function public.prepare_website_purchase_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  project_record public.client_projects%rowtype;
begin
  if left(new.description, length('[WEBOLDAL_MEGVASARLAS]')) <> '[WEBOLDAL_MEGVASARLAS]' then
    return new;
  end if;

  select * into project_record from public.client_projects where id = new.project_id;
  if project_record.commercial_model <> 'subscription' or project_record.user_id <> new.user_id then
    raise exception 'Csak a saját menedzselt weboldal vásárolható meg.';
  end if;
  if project_record.subscription_status in ('cancelled', 'cancel_requested') then
    raise exception 'Lemondás alatt vagy után nem indítható megvásárlás.';
  end if;

  new.quoted_amount := project_record.purchase_option_price;
  new.payment_reference := 'PE-' || upper(substr(replace(new.project_id::text, '-', ''), 1, 10));
  return new;
end;
$$;

drop trigger if exists prepare_website_purchase_request on public.change_requests;
create trigger prepare_website_purchase_request
before insert on public.change_requests
for each row execute function public.prepare_website_purchase_request();

create or replace function public.report_website_purchase_transfer(request_id uuid)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.change_requests%rowtype;
begin
  update public.change_requests request
  set transfer_reported_at = now(), status = 'in_progress'
  where request.id = request_id
    and request.user_id = auth.uid()
    and request.status = 'waiting_client'
    and left(request.description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
    and request.transfer_reported_at is null
  returning * into result;

  if result.id is null then
    raise exception 'Az utalás ennél a kérésnél nem jelezhető.';
  end if;
  return result;
end;
$$;

create or replace function public.complete_website_purchase(request_id uuid, handover jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_request public.change_requests%rowtype;
begin
  if not public.is_admin() then raise exception 'Nincs admin jogosultság.'; end if;
  if jsonb_typeof(handover) <> 'array' or jsonb_array_length(handover) = 0 then
    raise exception 'Az átadási terv nem lehet üres.';
  end if;

  select * into purchase_request from public.change_requests
  where id = request_id for update;
  if purchase_request.id is null
     or purchase_request.transfer_reported_at is null
     or purchase_request.status <> 'in_progress'
     or left(purchase_request.description, length('[WEBOLDAL_MEGVASARLAS]')) <> '[WEBOLDAL_MEGVASARLAS]' then
    raise exception 'A vásárlás még nem igazolható.';
  end if;

  update public.change_requests
  set status = 'completed', paid_at = now(), completed_at = now(),
      admin_note = coalesce(admin_note, '') || case when coalesce(admin_note, '') = '' then '' else E'\n\n' end || 'Az átutalás beérkezett. A technikai átadás elindult.'
  where id = request_id;

  update public.client_projects
  set commercial_model = 'purchase', subscription_status = 'cancelled',
      cancelled_at = now(), cancel_effective_at = now(),
      final_payment_paid = true, final_payment_paid_at = now(), payment_status = 'fully_paid',
      status = 'launched', handover_steps = handover,
      warranty_started_at = null, warranty_expires_at = null,
      next_step = 'A vételár beérkezett. Kövesd az átadási listát; a technikai garancia az igazolt átadáskor indul.'
  where id = purchase_request.project_id and commercial_model = 'subscription';

  return purchase_request.project_id;
end;
$$;

revoke all on function public.report_website_purchase_transfer(uuid) from public;
grant execute on function public.report_website_purchase_transfer(uuid) to authenticated;
revoke all on function public.complete_website_purchase(uuid, jsonb) from public;
grant execute on function public.complete_website_purchase(uuid, jsonb) to authenticated;

create or replace function public.close_completed_project(project_id uuid)
returns public.client_projects
language plpgsql
security definer
set search_path = public
as $$
declare
  project_record public.client_projects%rowtype;
  handover_completed_at timestamptz;
begin
  select * into project_record from public.client_projects
  where id = project_id and user_id = auth.uid() for update;
  if project_record.id is null or project_record.commercial_model = 'subscription'
     or project_record.status <> 'launched' or not project_record.final_payment_paid then
    raise exception 'A projekt még nem zárható le.';
  end if;
  if project_record.handover_steps is null or jsonb_array_length(project_record.handover_steps) = 0
     or exists (select 1 from jsonb_array_elements(project_record.handover_steps) step where coalesce((step ->> 'done')::boolean, false) = false) then
    raise exception 'Előbb minden átadási lépést teljesíteni kell.';
  end if;

  select max((step ->> 'done_at')::timestamptz) into handover_completed_at
  from jsonb_array_elements(project_record.handover_steps) step
  where nullif(step ->> 'done_at', '') is not null;
  handover_completed_at := coalesce(handover_completed_at, project_record.final_payment_paid_at, now());

  update public.client_projects
  set maintenance_option = null, followup_check_status = null, status = 'closed',
      warranty_started_at = handover_completed_at,
      warranty_expires_at = handover_completed_at + interval '30 days',
      next_step = 'A projekt lezárult. Az igazolt technikai átadástól számított 30 napig díjmentes technikai garancia védi az elkészült működést.'
  where id = project_id returning * into project_record;
  return project_record;
end;
$$;

revoke all on function public.close_completed_project(uuid) from public;
grant execute on function public.close_completed_project(uuid) to authenticated;

notify pgrst, 'reload schema';
