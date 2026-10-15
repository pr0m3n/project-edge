-- 048_silent_clients.sql
--
-- „Csendes ügyfél": a nyilvántartásban benne van, de a rendszer semmilyen
-- csatornán nem szól neki.
--
-- Miért kell: az ügyfélfelvétel aktív előfizetést hoz létre, és onnantól a
-- cronok maguktól írnak (havi jelentés, fizetési emlékeztető, évfordulós
-- levél), az admin műveletei pedig az `/api/notify`-on át értesítenek. Vannak
-- ügyfelek — akikkel emailben és telefonon állapodtunk meg, és a saját
-- nyilvántartásunkba vesszük fel őket —, akiknek ezek közül semmi nem
-- mehet ki. A kapcsolót a szerveroldali útvonalak nézik, nem a felület, így
-- egy elfelejtett gomb sem küld nekik levelet.

alter table public.client_projects
  add column if not exists silent boolean not null default false;

comment on column public.client_projects.silent is
  'Csendes ügyfél: nem kap emailt, ügyfélkapus értesítést, meghívót és automatikus számlát. Csak admin állíthatja.';

-- Az ügyfél nem kapcsolhatja ki-be maga (a 003-as RLS a saját sorát
-- írhatóvá teszi). Önálló trigger, mint a 046-ban: a meglévő őrök
-- átírása nagyobb kockázat lenne.
create or replace function public.guard_client_silent_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' and new.silent then
    raise exception 'Ez a mező csak a szolgáltató oldaláról állítható be.';
  end if;

  if tg_op = 'UPDATE' and new.silent is distinct from old.silent then
    raise exception 'Ez a mező csak a szolgáltató oldaláról módosítható.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_client_silent_flag on public.client_projects;
create trigger guard_client_silent_flag
  before insert or update on public.client_projects
  for each row execute function public.guard_client_silent_flag();
