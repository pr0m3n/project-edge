-- 1. Add balance column to profiles
alter table public.profiles
  add column if not exists balance numeric default 0;

-- 2. Create withdrawals table
create table if not exists public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric not null,
  method text not null,
  status text default 'Pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS
alter table public.withdrawals enable row level security;

-- 4. RLS: Users can view their own withdrawals
create policy "Users can view own withdrawals" on public.withdrawals
  for select using (auth.uid() = user_id);

-- 5. RLS: Users can insert their own withdrawals
create policy "Users can insert own withdrawals" on public.withdrawals
  for insert with check (auth.uid() = user_id);
