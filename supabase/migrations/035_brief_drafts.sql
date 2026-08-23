-- Félbehagyott projektindító adatlapok — szerveroldali piszkozat.
--
-- Eddig a brief KIZÁRÓLAG a látogató localStorage-ában élt (`pe-brief-draft-<uid>`
-- és `projectedge-public-brief-v1`). Ennek két következménye volt:
--
--   1. aki regisztrált, elkezdte az adatlapot, majd elnavigált, az nyomtalanul
--      eltűnt — nem lehetett emlékeztetőt küldeni neki, mert semmi nem tudott
--      róla, hogy egyáltalán elkezdte;
--   2. az admin nem látta, hol álltak meg az emberek, tehát nem derült ki,
--      melyik lépésnél morzsolódik le a legtöbb érdeklődő.
--
-- Ez a tábla FELHASZNÁLÓNKÉNT EGY piszkozatot tart (a portál is egy adatlapot
-- szerkeszt egyszerre), és szándékosan NEM a `client_projects` része: a
-- beküldetlen brief nem projekt, nem szabad, hogy bekeveredjen a valódi
-- projektek közé sem az ügyfélkapun, sem az adminban.
--
-- A `data` a teljes `BriefFormValues` objektum. Fájlt nem tartalmaz, csak a
-- feltöltött objektumok hivatkozásait — ugyanazokat, amiket a projekt is tárol.

create table if not exists public.brief_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text,
  company text,
  commercial_model text,
  subscription_plan text,
  /** Hányadik lépésnél tart (0-tól). */
  step int not null default 0,
  /** Hány lépésből áll az adatlap — hogy a százalék később is értelmezhető maradjon. */
  step_count int not null default 6,
  data jsonb not null default '{}'::jsonb,
  /** Kitöltötte és beküldte — innentől már projekt, nem piszkozat. */
  submitted_at timestamptz,
  /** Mikor ment ki az emlékeztető levél. Egy piszkozathoz legfeljebb egy megy. */
  reminder_sent_at timestamptz
);

create index if not exists brief_drafts_open_idx
  on public.brief_drafts(updated_at)
  where submitted_at is null;

revoke all on public.brief_drafts from anon;
grant select, insert, update, delete on public.brief_drafts to authenticated;

alter table public.brief_drafts enable row level security;

-- Az ügyfél kizárólag a SAJÁT piszkozatát írhatja; az admin mindet olvashatja.
drop policy if exists "Clients can manage own brief draft" on public.brief_drafts;
create policy "Clients can manage own brief draft"
on public.brief_drafts for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create or replace function public.touch_brief_draft()
returns trigger
language plpgsql
as $projectedge_brief_draft$
begin
  new.updated_at = now();
  return new;
end;
$projectedge_brief_draft$;

drop trigger if exists brief_drafts_set_updated_at on public.brief_drafts;
create trigger brief_drafts_set_updated_at
  before update on public.brief_drafts
  for each row execute function public.touch_brief_draft();

notify pgrst, 'reload schema';
