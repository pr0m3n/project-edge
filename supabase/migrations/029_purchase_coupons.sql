-- Egyszeri weboldalprojektek biztonságos kuponkezelése.
--
-- Az ügyfél csak a szerver route-on keresztül alkalmazhat kupont. Az ár és a
-- kedvezmény kiszámítása adatbázis-triggerekben történik, ezért a böngészőből
-- nem hamisítható. Egy kódot egy felhasználói fiók csak egyszer használhat.

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  percent smallint not null check (percent between 1 and 90),
  max_discount integer not null check (max_discount > 0),
  purchase_only boolean not null default true,
  active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.discount_codes enable row level security;
revoke all on public.discount_codes from anon, authenticated;

insert into public.discount_codes (code, percent, max_discount, purchase_only, active)
values ('INDULAS15', 15, 50000, true, true)
on conflict (code) do update
set percent = excluded.percent,
    max_discount = excluded.max_discount,
    purchase_only = excluded.purchase_only,
    active = excluded.active;

alter table public.client_projects
  add column if not exists base_offer_price integer,
  add column if not exists coupon_code text,
  add column if not exists coupon_percent smallint,
  add column if not exists coupon_max_discount integer,
  add column if not exists coupon_discount_amount integer not null default 0;

update public.client_projects
set base_offer_price = offer_price
where base_offer_price is null and offer_price is not null;

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.discount_codes(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.client_projects(id) on delete cascade,
  status text not null default 'applied' check (status in ('applied', 'redeemed')),
  applied_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (coupon_id, user_id),
  unique (project_id)
);

alter table public.coupon_redemptions enable row level security;
revoke all on public.coupon_redemptions from anon, authenticated;

create or replace function public.calculate_project_coupon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.commercial_model <> 'purchase' or new.base_offer_price is null then
    new.coupon_discount_amount := 0;
    if new.base_offer_price is not null then
      new.offer_price := new.base_offer_price;
    end if;
    return new;
  end if;

  if new.base_offer_price < 0 then
    raise exception 'Az ajánlati ár nem lehet negatív.';
  end if;

  if new.coupon_code is not null then
    if new.coupon_percent is null or new.coupon_max_discount is null then
      raise exception 'Hiányos kuponadatok.';
    end if;
    new.coupon_discount_amount := least(
      floor(new.base_offer_price * new.coupon_percent / 100.0)::integer,
      new.coupon_max_discount
    );
  else
    new.coupon_percent := null;
    new.coupon_max_discount := null;
    new.coupon_discount_amount := 0;
  end if;

  new.offer_price := greatest(0, new.base_offer_price - new.coupon_discount_amount);
  return new;
end;
$$;

drop trigger if exists calculate_project_coupon on public.client_projects;
create trigger calculate_project_coupon
before insert or update of base_offer_price, coupon_code, coupon_percent, coupon_max_discount
on public.client_projects
for each row execute function public.calculate_project_coupon();

-- Az új pénzügyi mezőket közvetlen kliensoldali PostgREST-hívás nem írhatja.
-- A hitelesített API route service role-lal, auth.uid() nélkül fut.
create or replace function public.guard_client_project_coupon_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() and (
    new.base_offer_price is distinct from old.base_offer_price
    or new.coupon_code is distinct from old.coupon_code
    or new.coupon_percent is distinct from old.coupon_percent
    or new.coupon_max_discount is distinct from old.coupon_max_discount
    or new.coupon_discount_amount is distinct from old.coupon_discount_amount
  ) then
    raise exception 'A kupon- és ármezők csak a biztonságos fizetési folyamatban módosíthatók.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_client_project_coupon_fields on public.client_projects;
create trigger guard_client_project_coupon_fields
before update on public.client_projects
for each row execute function public.guard_client_project_coupon_fields();

create or replace function public.apply_project_coupon_admin(
  target_project_id uuid,
  target_user_id uuid,
  requested_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  project_record public.client_projects%rowtype;
  coupon_record public.discount_codes%rowtype;
begin
  if auth.uid() is not null then
    raise exception 'Ezt a műveletet csak a szerver hajthatja végre.';
  end if;

  select * into project_record
  from public.client_projects
  where id = target_project_id and user_id = target_user_id
  for update;

  if project_record.id is null then
    raise exception 'A projekt nem található.';
  end if;
  if project_record.commercial_model <> 'purchase' then
    raise exception 'A kupon csak egyszeri weboldalvásárlásra használható.';
  end if;
  if project_record.offer_status <> 'sent' or project_record.status <> 'offer_sent' then
    raise exception 'A kupont a kiküldött ajánlat elfogadása előtt lehet alkalmazni.';
  end if;
  if coalesce(project_record.base_offer_price, project_record.offer_price) is null then
    raise exception 'Az ajánlatnak még nincs végleges ára.';
  end if;

  select * into coupon_record
  from public.discount_codes
  where code = upper(trim(requested_code))
    and active
    and valid_from <= now()
    and (valid_until is null or valid_until > now())
  for update;

  if coupon_record.id is null then
    raise exception 'A kuponkód érvénytelen vagy lejárt.';
  end if;

  insert into public.coupon_redemptions (coupon_id, user_id, project_id, status)
  values (coupon_record.id, target_user_id, target_project_id, 'applied')
  on conflict (coupon_id, user_id) do update
    set project_id = excluded.project_id,
        status = 'applied',
        applied_at = now(),
        redeemed_at = null
  where public.coupon_redemptions.project_id = excluded.project_id
    and public.coupon_redemptions.status = 'applied';

  if not found then
    raise exception 'Ezt a kuponkódot ez a fiók már felhasználta.';
  end if;

  update public.client_projects
  set base_offer_price = coalesce(base_offer_price, offer_price),
      coupon_code = coupon_record.code,
      coupon_percent = coupon_record.percent,
      coupon_max_discount = coupon_record.max_discount
  where id = target_project_id;

  select * into project_record from public.client_projects where id = target_project_id;
  return jsonb_build_object(
    'code', project_record.coupon_code,
    'percent', project_record.coupon_percent,
    'baseOfferPrice', project_record.base_offer_price,
    'discountAmount', project_record.coupon_discount_amount,
    'offerPrice', project_record.offer_price
  );
end;
$$;

create or replace function public.remove_project_coupon_admin(
  target_project_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  project_record public.client_projects%rowtype;
begin
  if auth.uid() is not null then
    raise exception 'Ezt a műveletet csak a szerver hajthatja végre.';
  end if;

  select * into project_record
  from public.client_projects
  where id = target_project_id and user_id = target_user_id
  for update;

  if project_record.id is null then
    raise exception 'A projekt nem található.';
  end if;
  if project_record.offer_status <> 'sent' or project_record.status <> 'offer_sent' then
    raise exception 'Az elfogadott ajánlat kuponja már nem távolítható el.';
  end if;

  delete from public.coupon_redemptions
  where project_id = target_project_id and user_id = target_user_id and status = 'applied';

  update public.client_projects
  set coupon_code = null,
      coupon_percent = null,
      coupon_max_discount = null
  where id = target_project_id;

  select * into project_record from public.client_projects where id = target_project_id;
  return jsonb_build_object(
    'code', null,
    'percent', null,
    'baseOfferPrice', project_record.base_offer_price,
    'discountAmount', project_record.coupon_discount_amount,
    'offerPrice', project_record.offer_price
  );
end;
$$;

create or replace function public.mark_project_coupon_redeemed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.offer_status = 'accepted' and old.offer_status is distinct from 'accepted' and new.coupon_code is not null then
    update public.coupon_redemptions
    set status = 'redeemed', redeemed_at = now()
    where project_id = new.id and status = 'applied';
  end if;
  return new;
end;
$$;

drop trigger if exists mark_project_coupon_redeemed on public.client_projects;
create trigger mark_project_coupon_redeemed
after update of offer_status on public.client_projects
for each row execute function public.mark_project_coupon_redeemed();

revoke all on function public.apply_project_coupon_admin(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.remove_project_coupon_admin(uuid, uuid) from public, anon, authenticated;

notify pgrst, 'reload schema';
