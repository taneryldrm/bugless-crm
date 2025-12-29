
-- 1. Drop the table completely to start fresh (safest way to align with code)
drop table if exists calendar_events cascade;

-- 2. Create table with ALL required columns based on Calendar.jsx logic
create table calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text default 'event',
  priority text default 'Normal',
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table calendar_events enable row level security;

-- 4. Create Policies
create policy "Users can view their own events" on calendar_events for select using (auth.uid() = user_id);
create policy "Users can insert their own events" on calendar_events for insert with check (auth.uid() = user_id);
create policy "Users can update their own events" on calendar_events for update using (auth.uid() = user_id);
create policy "Users can delete their own events" on calendar_events for delete using (auth.uid() = user_id);

-- 5. Realtime
alter publication supabase_realtime add table calendar_events;
