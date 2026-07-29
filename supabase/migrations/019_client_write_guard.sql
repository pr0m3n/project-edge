-- 019_client_write_guard.sql
--
-- FONTOS BIZTONSÁGI JAVÍTÁS. Ez a fájl LEVÁLTJA a 010_lock_financial_columns.sql-t
-- (azt nem kell lefuttatni; ha már lefutott, ez a migráció eltávolítja a régi
-- triggert és a helyére a lentit teszi).
--
-- Miért: a `Clients can manage own projects` policy `for all` volt, tehát egy
-- bejelentkezett ügyfél a böngészőből (anon kulccsal, közvetlen PostgREST
-- hívással) bármit írhatott a SAJÁT projektsorába — átállíthatta magát
-- `launched` vagy `closed` státuszra, nullázhatta az `offer_price`-t, vagy
-- törölhette a sort, kihagyva a törlési kérelem jóváhagyását.
--
-- A 010 azért nem volt használható, mert az összes pénzügyi mezőt tiltotta,
-- miközben a (szándékosan mock) fizetési folyamat a kliensből ír néhányat.
-- Ez a verzió ehelyett pontosan azt engedi, amit az ügyfélkapu valóban tesz:
--
--   * a fix 10 000 Ft foglaló beírását az ajánlat elfogadásakor,
--   * a `payment_status` 'unpaid' értékét,
--   * a whitelistázott státusz-átmeneteket,
--   * a saját (client) átadási lépéseinek pipálását.
--
-- Az ár, az ajánlat tartalma, a végszámla-jelölés, a staging link, a
-- mérföldkövek és az admin jegyzetek kizárólag adminról (vagy service role
-- kulccsal, szerver oldalról) módosíthatók.
--
-- Ha később valódi, szerver oldali fizetés készül: a `payment_status` és a
-- `deposit_amount` kivételét ki lehet venni innen, mert azokat akkor már a
-- service role írja, ami a `public.is_admin()` ágon amúgy is átmegy.

-- A 010 régi triggerének eltakarítása (ha lefutott volna).
drop trigger if exists guard_client_project_financials on public.client_projects;
drop function if exists public.guard_client_project_financials();

create or replace function public.guard_client_project_writes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_transition boolean;
  old_step jsonb;
  new_step jsonb;
  step_count integer;
  i integer;
begin
  -- Admin és service role mindent módosíthat.
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;

  -- 1. A projekt nem adható át más felhasználónak.
  if new.user_id is distinct from old.user_id then
    raise exception 'A projekt tulajdonosa nem módosítható.';
  end if;

  -- 2. Csak adminról írható mezők.
  if new.offer_price is distinct from old.offer_price
     or new.offer_currency is distinct from old.offer_currency
     or new.offer_title is distinct from old.offer_title
     or new.offer_summary is distinct from old.offer_summary
     or new.offer_scope is distinct from old.offer_scope
     or new.offer_timeline is distinct from old.offer_timeline
     or new.offer_deliverables is distinct from old.offer_deliverables
     or new.offer_note is distinct from old.offer_note
     or new.offer_sent_at is distinct from old.offer_sent_at
     or new.final_payment_paid is distinct from old.final_payment_paid
     or new.final_payment_paid_at is distinct from old.final_payment_paid_at
     or new.admin_notes is distinct from old.admin_notes
     or new.milestones is distinct from old.milestones
     or new.staging_url is distinct from old.staging_url
     or new.estimated_deadline is distinct from old.estimated_deadline
     or new.maintenance_monthly_fee is distinct from old.maintenance_monthly_fee
     or new.followup_check_fee is distinct from old.followup_check_fee then
    raise exception 'Ez a mező csak a szolgáltató oldaláról módosítható.';
  end if;

  -- 3. Fizetési státusz: az ügyfél nem jelentheti ki, hogy fizetett.
  if new.payment_status is distinct from old.payment_status
     and new.payment_status <> 'unpaid' then
    raise exception 'A fizetési státuszt a szolgáltató igazolja vissza.';
  end if;

  -- 4. Foglaló: csak a fix 10 000 Ft írható be (ajánlat elfogadásakor).
  if new.deposit_amount is distinct from old.deposit_amount
     and new.deposit_amount is distinct from 10000 then
    raise exception 'A foglaló összege nem módosítható.';
  end if;

  -- 5. Státusz-átmenetek whitelistje.
  if new.status is distinct from old.status then
    allowed_transition := (
      (old.status = 'offer_sent' and new.status in ('contract_pending', 'planning', 'closed'))
      or (old.status = 'contract_pending' and new.status = 'deposit_pending')
      or (old.status = 'review' and new.status = 'in_progress')
      or (old.status = 'launched' and new.status = 'closed')
      or (new.status = 'deletion_pending' and old.status not in ('closed', 'deletion_pending'))
    );

    if not allowed_transition then
      raise exception 'Ez a státuszváltás csak a szolgáltató oldaláról végezhető el (% -> %).', old.status, new.status;
    end if;
  end if;

  -- 6. Átadási lépések: az ügyfél csak a SAJÁT lépéseit pipálhatja.
  --    A lista szerkezetét (hossz, id-k, felelősök) nem írhatja át, és az
  --    admin-oldali lépések állapotához nem nyúlhat — különben ki tudná
  --    kényszeríteni a projekt lezárását.
  if new.handover_steps is distinct from old.handover_steps and old.handover_steps is not null then
    if jsonb_typeof(new.handover_steps) <> 'array' then
      raise exception 'Érvénytelen átadási lépéslista.';
    end if;

    step_count := jsonb_array_length(old.handover_steps);
    if jsonb_array_length(new.handover_steps) <> step_count then
      raise exception 'Az átadási lépések listája nem módosítható.';
    end if;

    for i in 0 .. step_count - 1 loop
      old_step := old.handover_steps -> i;
      new_step := new.handover_steps -> i;

      if (new_step ->> 'id') is distinct from (old_step ->> 'id')
         or (new_step ->> 'owner') is distinct from (old_step ->> 'owner') then
        raise exception 'Az átadási lépések sorrendje és felelőse nem módosítható.';
      end if;

      if (old_step ->> 'owner') = 'admin'
         and (new_step ->> 'done') is distinct from (old_step ->> 'done') then
        raise exception 'A szolgáltatói átadási lépéseket csak a szolgáltató igazolhatja vissza.';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_client_project_writes on public.client_projects;
create trigger guard_client_project_writes
  before update on public.client_projects
  for each row execute function public.guard_client_project_writes();

-- 7. A törlés kizárólag adminé: az ügyfélnek a törlési kérelmet kell
--    használnia (delete_requested + deletion_pending), amit az admin bírál el.
drop policy if exists "Clients can manage own projects" on public.client_projects;

drop policy if exists "Clients can read own projects" on public.client_projects;
create policy "Clients can read own projects"
on public.client_projects for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Clients can create own projects" on public.client_projects;
create policy "Clients can create own projects"
on public.client_projects for insert to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Clients can update own projects" on public.client_projects;
create policy "Clients can update own projects"
on public.client_projects for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can delete projects" on public.client_projects;
create policy "Admins can delete projects"
on public.client_projects for delete to authenticated
using (public.is_admin());

notify pgrst, 'reload schema';
