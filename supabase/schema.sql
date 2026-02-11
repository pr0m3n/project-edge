-- Create a table for public profiles (if not exists)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user', -- 'admin' or 'user'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create challenges table
create table if not exists public.challenges (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  firm text not null,
  size text not null,
  price numeric not null,
  order_id text not null,
  status text default 'Active', -- Active, Reviewing, Passed, Failed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for challenges
alter table public.challenges enable row level security;
create policy "Users can view own challenges" on public.challenges for select using (auth.uid() = user_id);
create policy "Users can insert own challenges" on public.challenges for insert with check (auth.uid() = user_id);
create policy "Admins can view all challenges" on public.challenges for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update challenges" on public.challenges for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Create payout_proofs table
create table if not exists public.payout_proofs (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.challenges not null,
  user_id uuid references auth.users not null,
  proof_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for payout_proofs
alter table public.payout_proofs enable row level security;
create policy "Users can view own proofs" on public.payout_proofs for select using (auth.uid() = user_id);
create policy "Users can insert own proofs" on public.payout_proofs for insert with check (auth.uid() = user_id);
create policy "Admins can view all proofs" on public.payout_proofs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Create partners table (Admin managed)
create table if not exists public.partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  discount_code text,
  discount_amount text, -- e.g. "40%"
  offer_details text,
  link text,
  image_url text,
  color text default 'text-white',
  bg_color text default 'bg-white/5',
  border_color text default 'border-white/10',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for partners
alter table public.partners enable row level security;
create policy "Partners are viewable by everyone" on public.partners for select using (true);
create policy "Admins can insert partners" on public.partners for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update partners" on public.partners for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can delete partners" on public.partners for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Create support_tickets table
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  subject text not null,
  message text not null,
  status text default 'Open', -- Open, Closed, Answered
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for support_tickets
alter table public.support_tickets enable row level security;
create policy "Users can view own tickets" on public.support_tickets for select using (auth.uid() = user_id);
create policy "Users can insert own tickets" on public.support_tickets for insert with check (auth.uid() = user_id);
create policy "Admins can view all tickets" on public.support_tickets for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update tickets" on public.support_tickets for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
