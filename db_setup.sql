-- MÁSOLD BE EZT A KÓDOT A SUPABASE SQL EDITORBA ÉS NYOMJ A 'RUN' GOMBRA --

-- 1. Profilok (Felhasználók kezelése)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.profiles enable row level security;
create policy "Public view" on public.profiles for select using (true);
create policy "User update own" on public.profiles for update using (auth.uid() = id);

-- Automatikus profil létrehozás regisztrációkor
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, role) values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- 2. Partner Cégek (Admin által szerkeszthető)
create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  discount_code text,
  discount_amount text,
  offer_details text,
  link text,
  image_url text,
  color text default 'text-white',
  bg_color text default 'bg-white/5',
  border_color text default 'border-white/10',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.partners enable row level security;
create policy "Mindenki latja" on public.partners for select using (true);
create policy "Admin irja" on public.partners for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 3. Hibajegyek (Support rendszer)
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  subject text not null,
  message text not null,
  status text default 'Open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.support_tickets enable row level security;
create policy "Sajat jegyek" on public.support_tickets for all using (auth.uid() = user_id);
create policy "Admin mindent lát" on public.support_tickets for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 4. Kifizetési Igények és Kihívások
create table if not exists public.challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  firm text not null,
  size text not null,
  price numeric not null,
  order_id text not null,
  status text default 'Active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.challenges enable row level security;
create policy "Sajat kihivasok" on public.challenges for all using (auth.uid() = user_id);
create policy "Admin mindent lat" on public.challenges for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create table if not exists public.payout_proofs (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.challenges not null,
  user_id uuid references auth.users not null,
  proof_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.payout_proofs enable row level security;
create policy "Sajat bizonyitekok" on public.payout_proofs for all using (auth.uid() = user_id);
