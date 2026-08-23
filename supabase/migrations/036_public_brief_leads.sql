-- Fiók nélkül elmentett projektindító adatlapok.
--
-- A 035-ös `brief_drafts` tábla BEJELENTKEZETT felhasználó piszkozatát tartja
-- (`user_id` elsődleges kulcs, RLS `auth.uid()`-ra). A nyilvános oldalon viszont
-- a látogatónak nincs fiókja — és a mérés szerint pont ez volt a legdrágább
-- veszteség: aki végigcsinálta az 5 lépést, de a záró képernyőn nem
-- regisztrált, arról a rendszer semmit nem tudott meg. A kitöltött brief az ő
-- gépén maradt a localStorage-ban, az adminba soha nem jutott el.
--
-- Ez a tábla ezt a rést zárja be: a látogató megadja az email címét, kap egy
-- folytatás-linket, és innentől bármelyik gépen ott folytathatja, ahol
-- abbahagyta. A stúdió pedig lát egy valódi érdeklődőt a teljes briefjével.
--
-- Anonim írás NINCS: kizárólag a szerveroldali `/api/briefs/public-link`
-- útvonal ír bele a service role kulccsal, ami rate limitet, honeypotot és
-- kitöltési idő ellenőrzést is futtat — ugyanaz a védelem, mint az
-- `/api/audit` esetében.

create table if not exists public.public_brief_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  /** A folytatás-link titka. Ezzel és az id-vel együtt olvasható vissza. */
  resume_token text not null,
  email text not null,
  company text,
  subscription_plan text,
  /** Hányadik lépésnél tartott, és hány lépésből állt akkor az adatlap. */
  step int not null default 0,
  step_count int not null default 5,
  /** A teljes `BriefFormValues`. Fájlt nem tartalmaz, csak hivatkozásokat. */
  data jsonb not null default '{}'::jsonb,
  /** Az ehhez tartozó support ticket — ezen keresztül tud írni a stúdiónak. */
  ticket_id uuid references public.support_tickets(id) on delete set null,
  /** Kitöltötte és fiókba mentette — innentől a `brief_drafts` viszi tovább. */
  claimed_at timestamptz,
  /** Mikor ment ki emlékeztető. Egy leadhez legfeljebb egy megy. */
  reminder_sent_at timestamptz
);

-- A visszaolvasás mindig (id, resume_token) párral történik.
create index if not exists public_brief_leads_token_idx
  on public.public_brief_leads(id, resume_token);

-- Ugyanaz az email ne szórja tele a listát: az admin nézethez a legfrissebb kell.
create index if not exists public_brief_leads_email_idx
  on public.public_brief_leads(email, updated_at desc);

create index if not exists public_brief_leads_open_idx
  on public.public_brief_leads(updated_at)
  where claimed_at is null;

-- Sem az anon, sem a bejelentkezett kliens nem nyúlhat hozzá közvetlenül:
-- kizárólag a service role írja és olvassa a szerveroldali útvonalakból.
revoke all on public.public_brief_leads from anon;
revoke all on public.public_brief_leads from authenticated;

alter table public.public_brief_leads enable row level security;

-- Az admin a saját felületén lássa a félbehagyott érdeklődőket.
drop policy if exists "Admins can read public brief leads" on public.public_brief_leads;
create policy "Admins can read public brief leads"
on public.public_brief_leads for select
to authenticated
using (public.is_admin());

create or replace function public.touch_public_brief_lead()
returns trigger
language plpgsql
as $projectedge_public_brief_lead$
begin
  new.updated_at = now();
  return new;
end;
$projectedge_public_brief_lead$;

drop trigger if exists public_brief_leads_set_updated_at on public.public_brief_leads;
create trigger public_brief_leads_set_updated_at
  before update on public.public_brief_leads
  for each row execute function public.touch_public_brief_lead();

notify pgrst, 'reload schema';
