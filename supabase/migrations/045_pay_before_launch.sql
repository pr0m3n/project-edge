-- 045_pay_before_launch.sql
--
-- A FIZETÉS A FOLYAMAT VÉGÉRE KERÜL.
--
-- Eddig a sorrend ez volt:
--   ajánlat → szerződés → FIZETÉS → építés → jóváhagyás → éles
--
-- Vagyis az ügyfélnek egy még el sem kezdett weboldalért kellett fizetnie,
-- egy olyan szolgáltatónak, akivel addig nem dolgozott. A mérés szerint ez
-- pont ott állította meg az embereket, ahol a legtöbbet számít: a honlapon
-- keresztül senki nem jutott el a fizetésig.
--
-- Az új sorrend:
--   ajánlat → szerződés → építés → jóváhagyás → FIZETÉS → éles
--
-- A szerződés MARAD elöl: az hitelesíti a megrendelést, rögzíti a terjedelmet
-- és az árat, és az teszi vitathatatlanná, mit rendelt. Csak a pénz mozdul
-- hátra.
--
-- Miért vállalható a kockázat bérlési modellben: ha valaki mégsem fizet, nem
-- adtunk át semmit. A weboldal a mi infrastruktúránkon marad, a saját
-- domainjére nem kerül ki. A tényleges védelem ez, nem a szerződés
-- behajtási kikötése — egy 15–40 ezer forintos követelésért perelni
-- gazdaságilag értelmetlen.
--
-- Ez a migráció KIZÁRÓLAG az ügyfél által kezdeményezhető státusz-átmenetek
-- listáját igazítja. Az admin (és a service role) mindent módosíthat, arra ez
-- a trigger nem vonatkozik — lásd a függvény elejét.

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
    raise exception 'A fizetési státuszt a szolgáltató igazolja.';
  end if;

  -- 4. A foglaló összege rögzített.
  if new.deposit_amount is distinct from old.deposit_amount
     and new.deposit_amount is distinct from 10000 then
    raise exception 'A foglaló összege nem módosítható.';
  end if;

  -- 5. Státusz-átmenetek whitelistje.
  --
  -- Az ÚJ sorrend miatt két átmenet változott:
  --   · a szerződés elfogadása most az ÉPÍTÉST indítja (nem a fizetést),
  --   · a jóváhagyás után kerül sor a FIZETÉSRE.
  --
  -- A régi `contract_pending -> deposit_pending` ág SZÁNDÉKOSAN bent marad:
  -- a migráció pillanatában folyamatban lévő projektek a régi sorrend szerint
  -- haladnak tovább, és nem akadhatnak el egy félbehagyott lépésnél.
  if new.status is distinct from old.status then
    allowed_transition := (
      (old.status = 'offer_sent' and new.status in ('contract_pending', 'planning', 'closed'))
      -- Szerződés elfogadva → indul az építés. Fizetés nélkül.
      or (old.status = 'contract_pending' and new.status in ('in_progress', 'deposit_pending'))
      -- Az ügyfél jóváhagyta az elkészült oldalt → most fizet.
      or (old.status = 'review' and new.status in ('deposit_pending', 'in_progress'))
      or (old.status = 'launched' and new.status = 'closed')
      or (new.status = 'deletion_pending' and old.status not in ('closed', 'deletion_pending'))
    );

    if not allowed_transition then
      raise exception 'Ez a státuszváltás csak a szolgáltató oldaláról végezhető el (% -> %).', old.status, new.status;
    end if;
  end if;

  -- 6. Átadási lépések: az ügyfél csak a SAJÁT lépéseit pipálhatja.
  if new.handover_steps is distinct from old.handover_steps and old.handover_steps is not null then
    if jsonb_typeof(new.handover_steps) <> 'array' then
      raise exception 'Az átadási lista szerkezete nem módosítható.';
    end if;
    if jsonb_array_length(new.handover_steps) <> jsonb_array_length(old.handover_steps) then
      raise exception 'Az átadási lista hossza nem módosítható.';
    end if;

    step_count := jsonb_array_length(old.handover_steps);
    i := 0;
    while i < step_count loop
      old_step := old.handover_steps -> i;
      new_step := new.handover_steps -> i;

      if (old_step ->> 'id') is distinct from (new_step ->> 'id')
         or (old_step ->> 'owner') is distinct from (new_step ->> 'owner') then
        raise exception 'Az átadási lépés azonosítója és felelőse nem módosítható.';
      end if;

      if (old_step ->> 'owner') = 'admin'
         and (old_step ->> 'done') is distinct from (new_step ->> 'done') then
        raise exception 'A szolgáltatói átadási lépés csak adminról pipálható.';
      end if;

      i := i + 1;
    end loop;
  end if;

  return new;
end;
$$;

-- A trigger a 019-ben `guard_client_project_writes` néven jött létre. Mindkét
-- lehetséges nevet eldobjuk, és az EREDETIVEL hozzuk létre újra: ha csak egy
-- új néven hoznánk létre, a régi is ott maradna, és ugyanaz az ellenőrzés
-- futna le kétszer minden íráskor.
drop trigger if exists guard_client_project_writes on public.client_projects;
drop trigger if exists guard_client_project_writes_trigger on public.client_projects;
create trigger guard_client_project_writes
  before update on public.client_projects
  for each row execute function public.guard_client_project_writes();

notify pgrst, 'reload schema';
