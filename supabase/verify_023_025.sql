-- Csak olvasó ellenőrzések a 023–025 migrációkhoz.
-- Futtasd a Supabase SQL Editorban; egyik lekérdezés sem módosít adatot.

-- 1) Ha a migrációkat Supabase CLI-val futtattad, a history-tábla létezik.
-- Kézi SQL Editoros futtatás esetén ez a tábla nem feltétlenül követi a fájlneveket.
select to_regclass('supabase_migrations.schema_migrations') as migration_history_table;
-- Ha az előző eredmény nem null, ezt is futtasd:
-- select version, name
-- from supabase_migrations.schema_migrations
-- where name like '023_%' or name like '024_%' or name like '025_%'
--    or version in ('023', '024', '025')
-- order by version;

-- 2) A brief-feltöltések privát bucketje.
select id, name, public
from storage.buckets
where id = 'client-assets';
-- Elvárt: pontosan 1 sor, public = false.

-- 3) A 024 által hozzáadott oszlopok.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'change_requests'
  and column_name in ('quoted_amount', 'payment_reference', 'transfer_reported_at', 'paid_at')
order by column_name;
-- Elvárt: mind a 4 oszlop szerepel.

-- 4) Vásárlásvédelmi index.
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'change_requests'
  and indexname = 'one_active_website_purchase_per_project';
-- Elvárt: pontosan 1 sor, részleges unique index.

-- 5) Vásárlási triggereken és az admin által hívható függvényeken.
select tgname, pg_get_triggerdef(oid) as trigger_definition
from pg_trigger
where tgrelid = 'public.change_requests'::regclass
  and not tgisinternal
order by tgname;
-- Elvárt triggereket keresd: guard_duplicate_website_purchase_request,
-- prepare_website_purchase_request.

select n.nspname as schema_name,
       p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'report_website_purchase_transfer',
    'complete_website_purchase',
    'close_completed_project',
    'prepare_website_purchase_request',
    'guard_duplicate_website_purchase_request'
  )
order by p.proname;
-- Elvárt: mind az 5 függvény, security_definer = true.

-- 6) Az új előfizetési árakat védő triggerfüggvény forrása.
select pg_get_functiondef('public.guard_managed_website_writes()'::regprocedure) as definition;
-- A kapott szövegben ezeknek szerepelniük kell: 14900, 24900, 39900,
-- 179000, 329000, 599000.

-- 7) A storage jogosultságok.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'Clients can upload own project assets',
    'Clients can view own project assets',
    'Clients can delete own project assets'
  )
order by policyname;
-- Elvárt: mind a 3 policy szerepel; mindegyik authenticated szerepkörre vonatkozik.
