-- 049_status_reports_email_log.sql
--
-- Két összefüggő dolog:
--
-- 1. ÁLLAPOTJELENTÉS ügyfélkapu nélkül. Van ügyfél, akinek nem kell belépés,
--    de egy negyedéves, magázó levél jól esik arról, hogy az oldala rendben
--    működik. Ő a 048-as `silent` módban van (semmilyen rendszerlevél nem
--    megy neki), és KIZÁRÓLAG ezt az egy levelet kapja.
--
-- 2. LEVÉLNAPLÓ. Minden kimenő levél ide kerül a tartalmával, a mögötte lévő
--    mért adattal és az eredménnyel — és itt várakozik az a jelentés is, amit
--    az admin még nem hagyott jóvá. A cél: hamis mérés ne mehessen ki
--    észrevétlenül, és utólag is látszódjon, mi ment ki és mi lett vele.

alter table public.client_projects
  add column if not exists status_reports boolean not null default false,
  add column if not exists status_report_autosend boolean not null default false,
  add column if not exists report_salutation text;

comment on column public.client_projects.status_reports is
  'Negyedéves állapotjelentés emailben (ügyfélkapu nélkül). Csak admin állíthatja.';
comment on column public.client_projects.status_report_autosend is
  'Ha igaz, a hibátlan mérésű jelentés jóváhagyás nélkül kimegy. Gyanús adatnál ilyenkor is jóváhagyásra vár.';
comment on column public.client_projects.report_salutation is
  'A jelentés megszólítása, pl. „Tisztelt Doktornő!". Üresen: „Tisztelt <kapcsolattartó>!".';

-- A 048-as őr kiterjesztése: ezeket sem állíthatja az ügyfél.
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

  if tg_op = 'INSERT' and (new.silent or new.status_reports or new.status_report_autosend or new.report_salutation is not null) then
    raise exception 'Ez a mező csak a szolgáltató oldaláról állítható be.';
  end if;

  if tg_op = 'UPDATE' and (
       new.silent is distinct from old.silent
    or new.status_reports is distinct from old.status_reports
    or new.status_report_autosend is distinct from old.status_report_autosend
    or new.report_salutation is distinct from old.report_salutation
  ) then
    raise exception 'Ez a mező csak a szolgáltató oldaláról módosítható.';
  end if;

  return new;
end;
$$;

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_id uuid references public.client_projects(id) on delete set null,
  /** status_report, monthly_report, payment_reminder, notify, … */
  kind text not null,
  to_email text,
  subject text not null,
  html text,
  text_body text,
  status text not null check (status in ('pending_approval', 'sent', 'failed', 'discarded')),
  error text,
  provider_id text,
  /** A levél mögötti mért adat — ebből lehet utólag ellenőrizni. */
  data jsonb,
  /** Az ellenőrzés eredménye: [{ level: 'block' | 'warn', message }]. */
  warnings jsonb not null default '[]'::jsonb,
  /** Időszak-kulcs (pl. 2026-Q4): egy jelentés időszakonként egyszer. */
  period_key text,
  sent_at timestamptz,
  decided_by uuid
);

create index if not exists email_log_created_idx on public.email_log (created_at desc);
create index if not exists email_log_project_idx on public.email_log (project_id, created_at desc);
create unique index if not exists email_log_period_once
  on public.email_log (project_id, kind, period_key)
  where period_key is not null and status <> 'discarded';

alter table public.email_log enable row level security;

-- Csak az admin olvashatja. Írni kizárólag a szerver (service role) ír.
drop policy if exists "email_log_admin_read" on public.email_log;
create policy "email_log_admin_read" on public.email_log
  for select to authenticated
  using (public.is_admin());
