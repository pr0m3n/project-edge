-- Ajánlat, fizetés és beszélgetés a módosítási kéréseken.
--
-- Eddig a `quoted_amount` és a `payment_reference` csak a weboldal-megvásárlási
-- kéréshez töltődött ki (024). Egy sima módosításnál az admin legfeljebb
-- „Külön ajánlat" státuszba tudta tenni a kérést, de árat nem adhatott hozzá,
-- az ügyfél pedig nem tudta se elfogadni, se kifizetni. Ez a migráció ezt a
-- hiányt zárja be, és beszélgetést is ad a kérésekhez.
--
-- BIZTONSÁG: a `change_requests` insert policy eddig bármilyen mezőértéket
-- elfogadott az ügyféltől, tehát elvileg beszúrhatott magának `quoted_amount:
-- 0`-t vagy `paid_at`-et. Innentől a pénzügyi mezőket kizárólag admin vagy
-- `security definer` függvény írhatja.

-- ── 1. Új mezők ──────────────────────────────────────────────────────────────
alter table public.change_requests
  add column if not exists quote_accepted_at timestamptz,
  add column if not exists quote_note text;

-- ── 2. Az ügyfél nem írhat pénzügyi mezőt ────────────────────────────────────
create or replace function public.guard_change_request_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin és szerveroldali (security definer) hívás érintetlenül megy át.
  if public.is_admin() or auth.uid() is null then return new; end if;

  if tg_op = 'INSERT' then
    if new.user_id <> auth.uid() then
      raise exception 'Más nevében nem küldhető kérés.';
    end if;
    -- A megvásárlási kérésnél a `prepare_website_purchase_request` tölti ki
    -- ezeket UTÁNA, szerveroldalon — itt csak a kliens értékeit dobjuk el.
    new.quoted_amount := null;
    new.payment_reference := null;
    new.transfer_reported_at := null;
    new.paid_at := null;
    new.quote_accepted_at := null;
    new.quote_note := null;
    new.included_in_plan := null;
    new.admin_note := null;
    new.status := 'new';
    return new;
  end if;

  -- UPDATE: az ügyfél csak a saját kérésén, és csak a leíráson változtathat.
  if old.user_id <> auth.uid() then
    raise exception 'Nem a saját kérésed.';
  end if;
  if new.quoted_amount is distinct from old.quoted_amount
    or new.payment_reference is distinct from old.payment_reference
    or new.paid_at is distinct from old.paid_at
    or new.transfer_reported_at is distinct from old.transfer_reported_at
    or new.quote_accepted_at is distinct from old.quote_accepted_at
    or new.quote_note is distinct from old.quote_note
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

drop trigger if exists guard_change_request_write on public.change_requests;
create trigger guard_change_request_write
before insert or update on public.change_requests
for each row execute function public.guard_change_request_write();

-- ── 3. Közlemény generálása, amikor az admin árat ad ─────────────────────────
--
-- A megvásárlási kérésnél a projektazonosítóból képzett közlemény már létezik.
-- Egy módosításnál viszont projektenként több fizetős kérés is lehet, ezért a
-- kérés azonosítójából képezzük — így a banki kivonaton összepárosítható.
create or replace function public.set_change_request_payment_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.quoted_amount is not null and new.payment_reference is null then
    new.payment_reference := 'PE-M' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists set_change_request_payment_reference on public.change_requests;
create trigger set_change_request_payment_reference
before update on public.change_requests
for each row execute function public.set_change_request_payment_reference();

-- ── 4. Ügyfél-műveletek az ajánlaton ─────────────────────────────────────────
create or replace function public.accept_change_quote(request_id uuid)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.change_requests%rowtype;
begin
  update public.change_requests request
  set quote_accepted_at = now()
  where request.id = request_id
    and request.user_id = auth.uid()
    and request.status = 'waiting_client'
    and request.quoted_amount is not null
    and request.quote_accepted_at is null
  returning * into result;

  if result.id is null then
    raise exception 'Ehhez a kéréshez most nem fogadható el ajánlat.';
  end if;
  return result;
end;
$$;

create or replace function public.decline_change_quote(request_id uuid)
returns public.change_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.change_requests%rowtype;
begin
  update public.change_requests request
  set status = 'declined', completed_at = now()
  where request.id = request_id
    and request.user_id = auth.uid()
    and request.status = 'waiting_client'
    and request.transfer_reported_at is null
  returning * into result;

  if result.id is null then
    raise exception 'Ez a kérés most nem utasítható el.';
  end if;
  return result;
end;
$$;

/**
 * Utalás jelzése egy ÁRAZOTT módosítási kérésnél.
 *
 * A megvásárlási kérésnek külön függvénye van (024), mert ott a projekt
 * állapotát is vizsgálni kell. Ez az általános változat kifejezetten kizárja a
 * megvásárlási kéréseket, hogy a két folyamat ne keveredjen.
 */
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
  set transfer_reported_at = now()
  where request.id = request_id
    and request.user_id = auth.uid()
    and request.status = 'waiting_client'
    and request.quote_accepted_at is not null
    and request.transfer_reported_at is null
    and left(request.description, length('[WEBOLDAL_MEGVASARLAS]')) <> '[WEBOLDAL_MEGVASARLAS]'
  returning * into result;

  if result.id is null then
    raise exception 'Az utalás ennél a kérésnél nem jelezhető.';
  end if;
  return result;
end;
$$;

revoke all on function public.accept_change_quote(uuid) from public, anon;
revoke all on function public.decline_change_quote(uuid) from public, anon;
revoke all on function public.report_change_transfer(uuid) from public, anon;
grant execute on function public.accept_change_quote(uuid) to authenticated;
grant execute on function public.decline_change_quote(uuid) to authenticated;
grant execute on function public.report_change_transfer(uuid) to authenticated;

-- ── 5. Beszélgetés a kérésen belül ───────────────────────────────────────────
--
-- Külön tábla és nem a `ticket_messages` újrahasznosítása: a ticketek önálló
-- ügyek saját státusszal, a kérés-üzenet viszont mindig egy konkrét kéréshez
-- tartozik, és vele együtt zárul le.
create table if not exists public.change_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.change_requests(id) on delete cascade,
  sender text not null check (sender in ('client', 'admin')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.change_request_messages enable row level security;

create index if not exists change_request_messages_request_idx
  on public.change_request_messages(request_id, created_at);

drop policy if exists "Participants read change messages" on public.change_request_messages;
create policy "Participants read change messages" on public.change_request_messages
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.change_requests request
      where request.id = request_id and request.user_id = auth.uid()
    )
  );

-- A `sender` nem a kliens szava: az ügyfél csak 'client'-ként írhat, az admin
-- csak 'admin'-ként. Enélkül egy ügyfél sajátmagának írhatna „admin" üzenetet.
drop policy if exists "Participants write change messages" on public.change_request_messages;
create policy "Participants write change messages" on public.change_request_messages
  for insert to authenticated with check (
    (public.is_admin() and sender = 'admin')
    or (
      sender = 'client'
      and exists (
        select 1 from public.change_requests request
        where request.id = request_id and request.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Admins manage change messages" on public.change_request_messages;
create policy "Admins manage change messages" on public.change_request_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
