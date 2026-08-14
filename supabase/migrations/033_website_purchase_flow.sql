-- 033_website_purchase_flow.sql
--
-- A bérlésből történő weboldal-tulajdonba vétel nem módosítási kérés.
-- Külön rekordot kap, külön fizetési állapotokkal és külön átadási folyamattal.

create table if not exists public.website_purchases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.client_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'requested'
    check (status in ('requested', 'payment_pending', 'transfer_reported', 'handover', 'completed', 'declined', 'cancelled')),
  payment_method text check (payment_method in ('card', 'bank_transfer')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'reported', 'paid', 'failed')),
  amount integer not null check (amount > 0),
  payment_reference text not null unique,
  admin_note text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  transfer_reported_at timestamptz,
  paid_at timestamptz,
  completed_at timestamptz,
  billing_name text,
  billing_email text,
  billing_country text default 'HU',
  billing_postal_code text,
  billing_city text,
  billing_address text,
  billing_tax_number text
);

alter table public.website_purchases enable row level security;

create index if not exists website_purchases_project_idx
  on public.website_purchases(project_id, created_at desc);

create index if not exists website_purchases_user_idx
  on public.website_purchases(user_id, created_at desc);

create unique index if not exists one_active_website_purchase_per_project_v2
  on public.website_purchases(project_id)
  where status not in ('completed', 'declined', 'cancelled');

drop trigger if exists website_purchases_set_updated_at on public.website_purchases;
create trigger website_purchases_set_updated_at
before update on public.website_purchases
for each row execute function public.set_updated_at();

revoke all on public.website_purchases from anon, authenticated;
grant select on public.website_purchases to authenticated;

drop policy if exists "Participants read website purchases" on public.website_purchases;
create policy "Participants read website purchases"
on public.website_purchases for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Az ügyfél nem írhat közvetlenül pénzügyi vagy állapotmezőt.
create or replace function public.create_website_purchase(p_project_id uuid)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  project_record public.client_projects%rowtype;
  existing public.website_purchases%rowtype;
  result public.website_purchases%rowtype;
begin
  select * into project_record
  from public.client_projects
  where id = p_project_id and user_id = auth.uid()
  for update;

  if project_record.id is null
     or project_record.commercial_model <> 'subscription'
     or project_record.subscription_status in ('cancelled', 'cancel_requested') then
    raise exception 'Ehhez a weboldalhoz most nem indítható tulajdonba vétel.';
  end if;

  select * into existing
  from public.website_purchases
  where project_id = p_project_id
    and status not in ('completed', 'declined', 'cancelled')
  order by created_at desc
  limit 1;
  if existing.id is not null then return existing; end if;

  insert into public.website_purchases (
    project_id, user_id, amount, payment_reference, billing_name, billing_email
  ) values (
    project_record.id,
    project_record.user_id,
    coalesce(project_record.purchase_option_price, 0),
    'PE-VAS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    project_record.contact_name,
    project_record.contact_email
  ) returning * into result;

  if result.amount <= 0 then
    raise exception 'Ehhez a weboldalhoz nincs érvényes vételár beállítva.';
  end if;
  return result;
end;
$$;

create or replace function public.prepare_website_purchase(p_purchase_id uuid, p_admin_note text)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.website_purchases%rowtype;
begin
  if not public.is_admin() then raise exception 'Nincs admin jogosultság.'; end if;
  update public.website_purchases
  set status = 'payment_pending',
      admin_note = nullif(trim(coalesce(p_admin_note, '')), '')
  where id = p_purchase_id
    and status in ('requested', 'payment_pending')
  returning * into result;
  if result.id is null then raise exception 'A tulajdonba vétel már nem készíthető elő.'; end if;
  return result;
end;
$$;

create or replace function public.set_website_purchase_payment_method(
  p_purchase_id uuid,
  p_payment_method text
)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.website_purchases%rowtype;
begin
  if p_payment_method not in ('card', 'bank_transfer') then
    raise exception 'Érvénytelen fizetési mód.';
  end if;
  update public.website_purchases
  set payment_method = p_payment_method,
      status = 'payment_pending',
      payment_status = case when payment_status = 'failed' then 'unpaid' else payment_status end
  where id = p_purchase_id
    and user_id = auth.uid()
    and status = 'payment_pending'
    and payment_status in ('unpaid', 'failed')
  returning * into result;
  if result.id is null then raise exception 'A fizetési mód most nem módosítható.'; end if;
  return result;
end;
$$;

create or replace function public.update_website_purchase_billing(
  p_purchase_id uuid,
  p_name text,
  p_email text,
  p_country text,
  p_postal_code text,
  p_city text,
  p_address text,
  p_tax_number text
)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.website_purchases%rowtype;
begin
  update public.website_purchases
  set billing_name = nullif(trim(coalesce(p_name, '')), ''),
      billing_email = nullif(trim(coalesce(p_email, '')), ''),
      billing_country = upper(coalesce(nullif(trim(p_country), ''), 'HU')),
      billing_postal_code = nullif(trim(coalesce(p_postal_code, '')), ''),
      billing_city = nullif(trim(coalesce(p_city, '')), ''),
      billing_address = nullif(trim(coalesce(p_address, '')), ''),
      billing_tax_number = nullif(trim(coalesce(p_tax_number, '')), '')
  where id = p_purchase_id
    and user_id = auth.uid()
    and status = 'payment_pending'
    and payment_status <> 'paid'
  returning * into result;
  if result.id is null then raise exception 'A számlázási adatok most nem módosíthatók.'; end if;
  return result;
end;
$$;

create or replace function public.report_website_purchase_transfer_v2(p_purchase_id uuid)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.website_purchases%rowtype;
begin
  update public.website_purchases
  set transfer_reported_at = now(),
      payment_status = 'reported',
      status = 'transfer_reported'
  where id = p_purchase_id
    and user_id = auth.uid()
    and payment_method = 'bank_transfer'
    and status = 'payment_pending'
    and payment_status = 'unpaid';
  -- A változó frissítés külön van, hogy a visszatérési rekordot ténylegesen kiolvassuk.
  select * into result from public.website_purchases where id = p_purchase_id;
  if result.id is null or result.status <> 'transfer_reported' then
    raise exception 'Az átutalás ennél a tulajdonba vételnél most nem jelezhető.';
  end if;
  return result;
end;
$$;

create or replace function public.activate_website_purchase(
  p_purchase_id uuid,
  p_handover jsonb
)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  purchase_record public.website_purchases%rowtype;
  project_record public.client_projects%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
     and not public.is_admin() then
    raise exception 'Nincs admin jogosultság.';
  end if;
  if jsonb_typeof(p_handover) <> 'array' or jsonb_array_length(p_handover) = 0 then
    raise exception 'Az átadási terv nem lehet üres.';
  end if;

  select * into purchase_record from public.website_purchases where id = p_purchase_id for update;
  if purchase_record.id is null then raise exception 'A tulajdonba vétel nem található.'; end if;
  if purchase_record.status in ('handover', 'completed') then return purchase_record; end if;
  if purchase_record.payment_status not in ('unpaid', 'reported')
     or purchase_record.status not in ('payment_pending', 'transfer_reported') then
    raise exception 'A vételár még nem igazolható.';
  end if;

  select * into project_record from public.client_projects where id = purchase_record.project_id for update;
  if project_record.id is null or project_record.commercial_model <> 'subscription' then
    raise exception 'A menedzselt weboldal már nem aktív előfizetésként.';
  end if;

  update public.website_purchases
  set status = 'handover', payment_status = 'paid', paid_at = now()
  where id = p_purchase_id;

  update public.client_projects
  set commercial_model = 'purchase',
      subscription_status = 'cancelled',
      cancelled_at = now(),
      cancel_effective_at = now(),
      final_payment_paid = true,
      final_payment_paid_at = now(),
      payment_status = 'fully_paid',
      status = 'launched',
      handover_steps = p_handover,
      warranty_started_at = null,
      warranty_expires_at = null,
      next_step = 'A vételár beérkezett. Kövesd a vezetett átadást; a 30 napos technikai garancia az igazolt lezáráskor indul.'
  where id = purchase_record.project_id;

  select * into purchase_record from public.website_purchases where id = p_purchase_id;
  return purchase_record;
end;
$$;

create or replace function public.cancel_website_purchase(p_purchase_id uuid, p_note text)
returns public.website_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.website_purchases%rowtype;
begin
  if not public.is_admin() then raise exception 'Nincs admin jogosultság.'; end if;
  update public.website_purchases
  set status = 'cancelled',
      admin_note = nullif(trim(coalesce(p_note, '')), '')
  where id = p_purchase_id
    and status not in ('handover', 'completed', 'cancelled');
  select * into result from public.website_purchases where id = p_purchase_id;
  if result.id is null then raise exception 'A tulajdonba vétel nem található.'; end if;
  return result;
end;
$$;

revoke all on function public.create_website_purchase(uuid) from public, anon;
revoke all on function public.prepare_website_purchase(uuid, text) from public, anon;
revoke all on function public.set_website_purchase_payment_method(uuid, text) from public, anon;
revoke all on function public.update_website_purchase_billing(uuid, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.report_website_purchase_transfer_v2(uuid) from public, anon;
revoke all on function public.activate_website_purchase(uuid, jsonb) from public, anon;
revoke all on function public.cancel_website_purchase(uuid, text) from public, anon;
grant execute on function public.create_website_purchase(uuid) to authenticated;
grant execute on function public.prepare_website_purchase(uuid, text) to authenticated;
grant execute on function public.set_website_purchase_payment_method(uuid, text) to authenticated;
grant execute on function public.update_website_purchase_billing(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.report_website_purchase_transfer_v2(uuid) to authenticated;
grant execute on function public.activate_website_purchase(uuid, jsonb) to authenticated;
grant execute on function public.activate_website_purchase(uuid, jsonb) to service_role;
grant execute on function public.cancel_website_purchase(uuid, text) to authenticated;

-- A régi kivásárlási kérés ne maradjon látható külön ügyként az új felület mellett.
-- Projektenként csak a legutóbbi aktív régi igényből készítünk purchase rekordot.
with ranked_legacy_requests as (
  select
    request.*,
    row_number() over (
      partition by request.project_id
      order by request.requested_at desc, request.id desc
    ) as request_rank
  from public.change_requests request
  where left(request.description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
    and request.status not in ('completed', 'declined')
)
insert into public.website_purchases (
  project_id, user_id, status, payment_method, payment_status, amount,
  payment_reference, admin_note, transfer_reported_at, paid_at, created_at
)
select
  request.project_id,
  request.user_id,
  case
    when request.transfer_reported_at is not null then 'transfer_reported'
    else 'requested'
  end,
  case when request.transfer_reported_at is not null then 'bank_transfer' else null end,
  case when request.transfer_reported_at is not null then 'reported' else 'unpaid' end,
  coalesce(request.quoted_amount, project.purchase_option_price, 0),
  coalesce(request.payment_reference, 'PE-VAS-' || upper(substr(replace(request.id::text, '-', ''), 1, 8))),
  request.admin_note,
  request.transfer_reported_at,
  null,
  request.requested_at
from ranked_legacy_requests request
join public.client_projects project on project.id = request.project_id
where request.request_rank = 1
  and coalesce(project.purchase_option_price, request.quoted_amount, 0) > 0
  and not exists (
    select 1
    from public.website_purchases existing_purchase
    where existing_purchase.project_id = request.project_id
  )
on conflict (payment_reference) do nothing;

update public.change_requests
set status = 'completed',
    completed_at = coalesce(completed_at, now()),
    admin_note = coalesce(admin_note, '') || case when coalesce(admin_note, '') = '' then '' else E'\n\n' end || 'Átkerült az új tulajdonba-vételi folyamatba.'
where left(description, length('[WEBOLDAL_MEGVASARLAS]')) = '[WEBOLDAL_MEGVASARLAS]'
  and status not in ('completed', 'declined');

-- Már kifizetett, régi folyamatból átkerült projektek: a technikai átadás maradjon
-- látható, de már az új purchase rekord alatt.
insert into public.website_purchases (
  project_id, user_id, status, payment_method, payment_status, amount,
  payment_reference, admin_note, paid_at, completed_at, created_at
)
select
  project.id,
  project.user_id,
  case when project.status = 'closed' then 'completed' else 'handover' end,
  'bank_transfer',
  'paid',
  coalesce(project.purchase_option_price, 1),
  'PE-VAS-' || upper(substr(replace(project.id::text, '-', ''), 1, 8)),
  'Korábbi kivásárlás átvezetve az új tulajdonba-vételi folyamatba.',
  coalesce(project.final_payment_paid_at, now()),
  case when project.status = 'closed' then coalesce(project.warranty_started_at, now()) else null end,
  coalesce(project.final_payment_paid_at, project.created_at)
from public.client_projects project
where project.commercial_model = 'purchase'
  and not exists (select 1 from public.website_purchases purchase where purchase.project_id = project.id)
  and coalesce(project.purchase_option_price, 0) > 0
on conflict (payment_reference) do nothing;

-- A meglévő lezárási RPC a technikai átadás lezárásakor a purchase rekordot is zárja.
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

  update public.website_purchases purchase
  set status = 'completed', completed_at = now()
  where purchase.project_id = $1 and purchase.status = 'handover';

  return project_record;
end;
$$;

notify pgrst, 'reload schema';
