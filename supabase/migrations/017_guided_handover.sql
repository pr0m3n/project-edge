-- 017_guided_handover.sql
--
-- Vezetett átadás (Vercel / Supabase / Resend / GitHub / DNS) az ügyfélkapuban.
--
-- A régi `handover_checklist` egy szabad szöveges lista volt, amit az admin
-- kézzel pipált — az ügyfél nem látta, mit KELL tennie, ezért maradt a
-- telefonálás és az üzenetezés. A `handover_steps` ezt strukturálja:
-- minden lépésnek van felelőse (client / admin), sorrendje, hivatkozásai és
-- opcionálisan egy mezője, amit az ügyfél kitölt (pl. a Vercel csapat neve).
--
-- Séma (jsonb tömb, sorrend = a lépések sorrendje):
-- [{
--   "id": "vercel_team",           -- stabil azonosító (lib/handover.ts)
--   "owner": "client" | "admin",   -- kinél van a lépés
--   "done": false,
--   "done_at": null,               -- ISO időbélyeg
--   "value": null                  -- az ügyfél/admin által beírt adat
-- }]
--
-- A címeket, leírásokat és linkeket NEM tároljuk az adatbázisban: azok a
-- kódban élnek (lib/handover.ts), így szövegjavításhoz nem kell migrálni a
-- meglévő projekteket.

alter table public.client_projects
  add column if not exists handover_steps jsonb;

comment on column public.client_projects.handover_steps is
  'Vezetett átadási lépések állapota. A lépések definícióját (cím, leírás, linkek) a lib/handover.ts tartalmazza, itt csak id/owner/done/done_at/value van.';

notify pgrst, 'reload schema';
