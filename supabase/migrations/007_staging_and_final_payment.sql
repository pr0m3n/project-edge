-- Staging URL: admin shares preview link with client
alter table public.client_projects
  add column if not exists staging_url text;

-- Final payment tracking: admin marks when remaining 70% is received
alter table public.client_projects
  add column if not exists final_payment_paid boolean not null default false;

alter table public.client_projects
  add column if not exists final_payment_paid_at timestamptz;

notify pgrst, 'reload schema';
