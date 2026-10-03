-- AI-asszisztens a weboldali chatben.
--
-- A látogató regisztráció és email nélkül kérdezhet: a beszélgetés egy
-- `bot` állapotú ticketként indul, név és email nélkül, és az AI válaszol.
-- Ha az AI nem tudja a választ, vagy a látogató Patrikot kéri, a látogató
-- megadja a nevét és az emailjét, a ticket `open` lesz, és onnantól ugyanúgy
-- megy tovább, mint egy kézzel indított beszélgetés.
--
-- A migráció NEM romboló és visszafelé kompatibilis: a régi kód sosem ír
-- `bot` állapotot vagy küldőt, a régi ticketeknek pedig van nevük és emailjük.

-- 1. A bot-beszélgetésnek még nincs neve és emailje.
alter table public.support_tickets alter column name drop not null;
alter table public.support_tickets alter column email drop not null;

-- A régi CHECK-ek neve a Postgres alapértelmezése szerint `<tábla>_<oszlop>_check`,
-- de ha a tábla valaha más úton jött létre, a név eltérhet — és egy
-- bennmaradt régi CHECK továbbra is elutasítaná a `bot` értéket. Ezért név
-- helyett a tartalmuk alapján dobjuk el őket.
do $projectedge_checks$
declare
  constraint_row record;
begin
  for constraint_row in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'c'
      and (
        (conrelid = 'public.support_tickets'::regclass and pg_get_constraintdef(oid) ilike '%status%')
        or (conrelid = 'public.support_ticket_messages'::regclass and pg_get_constraintdef(oid) ilike '%sender%')
      )
  loop
    execute format('alter table %s drop constraint %I', constraint_row.table_name, constraint_row.conname);
  end loop;
end;
$projectedge_checks$;

-- 2. Új állapot: `bot` — az AI kezeli, embertől még nem kért segítséget.
alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in ('bot', 'open', 'answered', 'closed'));

-- 3. Új küldő: `bot`.
alter table public.support_ticket_messages
  add constraint support_ticket_messages_sender_check
  check (sender in ('customer', 'admin', 'bot'));

-- 4. Az átadás nyoma. A `handoff_reason` akkor is kitöltődik, ha az AI
--    átadást javasolt, de a látogató végül nem adta meg az elérhetőségét —
--    az adminban így látszanak az elpártolt, de valódi érdeklődők is.
alter table public.support_tickets add column if not exists handoff_reason text;
alter table public.support_tickets add column if not exists handoff_at timestamptz;

-- 5. Az állapotváltó trigger: a `bot` állapotú beszélgetést a látogató és a
--    bot üzenete NEM nyitja meg (különben minden AI-beszélgetés megválaszolatlan
--    ügyként jelenne meg az adminban). Az admin válasza viszont átveszi:
--    `answered` lesz, és onnantól a bot nem válaszol.
create or replace function public.touch_support_ticket()
returns trigger as $projectedge$
begin
  update public.support_tickets
  set
    updated_at = now(),
    last_message_at = now(),
    status = case
      when new.sender = 'admin' then 'answered'
      when new.sender = 'bot' then status
      when new.sender = 'customer' and status = 'bot' then 'bot'
      when new.sender = 'customer' then 'open'
      else status
    end
  where id = new.ticket_id;

  return new;
end;
$projectedge$ language plpgsql;

create index if not exists support_tickets_status_last_message_idx
on public.support_tickets(status, last_message_at desc);

notify pgrst, 'reload schema';
