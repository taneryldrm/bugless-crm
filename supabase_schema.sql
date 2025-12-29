-- BUGLESS CRM DATABASE SCHEMA
-- Run this script in the Supabase SQL Editor

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create PROFILES table (Public profile for each Auth User)
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  email text,
  avatar_url text,
  role text default 'Mühendis', -- 'Yönetici' or 'Mühendis'
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Create CLIENTS table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  name text not null,
  type text check (type in ('Normal', 'Kurumsal')),
  status text check (status in ('Aktif', 'Pasif', 'Sıkıntılı')),
  phone text,
  email text,
  address text,
  notes text
);

-- 4. Create PROJECTS table
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  name text not null,
  client_id uuid references public.clients(id),
  status text default 'Hazırlık',
  start_date date,
  end_date date,
  price numeric default 0,
  description text,
  manager_id uuid references public.profiles(id),
  team_ids text[] -- Simple array of profile IDs for now
);

-- 5. Create WORK_ORDERS table
create table public.work_orders (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text default 'Bekliyor',
  priority text default 'Normal',
  due_date date,
  project_id uuid references public.projects(id),
  assigned_to uuid[] -- Array of profile IDs
);

-- 6. Create EXTERNAL_TASKS table
create table public.external_tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text default 'Bekliyor',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  assigned_to uuid[]
);

-- 7. Create WORK_SESSIONS table (For Timer Widget)
create table public.work_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration integer, -- in seconds
  location text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 8. Create TRANSACTIONS table (Finance)
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  date date default CURRENT_DATE,
  type text check (type in ('income', 'expense')),
  category text,
  amount numeric not null,
  description text,
  payer text,
  method text default 'Cash',
  project_id uuid references public.projects(id),
  is_paid boolean default true
);

-- 9. Create CALENDAR_EVENTS table
create table public.calendar_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  title text not null,
  description text,
  start_time timestamp with time zone,
  type text default 'task',
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 10. Create PERSONAL_NOTES table
create table public.personal_notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id),
  content text,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id) -- One note  per user
);


-- ROW LEVEL SECURITY (RLS) POLICIES --

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.work_orders enable row level security;
alter table public.external_tasks enable row level security;
alter table public.work_sessions enable row level security;
alter table public.transactions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.personal_notes enable row level security;

-- PROFILES Policies
create policy "Public profiles are viewable by everyone" 
  on profiles for select using ( true );
create policy "Users can insert their own profile" 
  on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile" 
  on profiles for update using ( auth.uid() = id );

-- HELPER FUNCTION for Role Checks
create or replace function is_admin() 
returns boolean as $$
  select exists (
    select 1 from profiles 
    where id = auth.uid() and role = 'Yönetici'
  );
$$ language sql security definer;

-- BUSINESS DATA (Clients, Projects, Tasks)
-- Admin: Full Access
create policy "Admins have full access to clients" on clients for all using ( is_admin() );
create policy "Admins have full access to projects" on projects for all using ( is_admin() );
create policy "Admins have full access to work_orders" on work_orders for all using ( is_admin() );
create policy "Admins have full access to external_tasks" on external_tasks for all using ( is_admin() );

-- Engineer (Standard User): Read Access to Business Data
create policy "Staff can view clients" on clients for select using ( true );
create policy "Staff can view projects" on projects for select using ( true );
create policy "Staff can view work_orders" on work_orders for select using ( true );
create policy "Staff can view external_tasks" on external_tasks for select using ( true );

-- Engineer: Edit assigned tasks (Optional - for now keeping simple read)

-- PERSONAL DATA (Calendar, Notes, Sessions)
-- Users can only see/edit their own
create policy "Users manage own calendar" on calendar_events for all using ( auth.uid() = user_id );
create policy "Users manage own notes" on personal_notes for all using ( auth.uid() = user_id );
create policy "Users manage own sessions" on work_sessions for all using ( auth.uid() = user_id );

-- FINANCE DATA (Transactions)
-- STRICT: Only Admins can see or touch transactions
create policy "Admins have full access to transactions" 
  on transactions 
  for all 
  using ( is_admin() );

-- Engineers/Others get NO POLICY for transactions, meaning implied DENY ALL.

-- TRIGGERS --

-- Auto-create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, role, created_at)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url', 'Mühendis', now());
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
