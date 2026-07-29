alter table public.client_projects
  add column if not exists warranty_started_at timestamptz,
  add column if not exists warranty_expires_at timestamptz;

comment on column public.client_projects.warranty_started_at is
  'A 30 napos díjmentes technikai garancia tényleges kezdete, a projekt ügyfél általi lezárásakor.';

comment on column public.client_projects.warranty_expires_at is
  'A technikai garancia vége. Nem karbantartási előfizetés és nem automatikus ellenőrzési kötelezettség.';
