-- Run this in your Supabase SQL editor

-- Digital Assets table
create table if not exists digital_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  platform text not null,
  type text not null,
  username text,
  estimated_value numeric default 0,
  instructions text,
  notes text,
  created_at timestamptz default now()
);
alter table digital_assets enable row level security;
create policy "users manage own digital assets" on digital_assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Family Members table
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  email text not null,
  relationship text,
  access_level text,
  notes text,
  created_at timestamptz default now()
);
alter table family_members enable row level security;
create policy "users manage own family members" on family_members
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Compliance Checks table
create table if not exists compliance_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  check_id text not null,
  completed boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, check_id)
);
alter table compliance_checks enable row level security;
create policy "users manage own compliance" on compliance_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Profiles table
create table if not exists profiles (
  id uuid primary key references auth.users,
  full_name text,
  phone text,
  date_of_birth date,
  state text,
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "users manage own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
