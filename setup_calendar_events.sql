-- Create calendar_events table
create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  type text default 'personal', -- 'personal', 'work', 'block'
  priority text default 'Normal',
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.calendar_events enable row level security;

-- Policies
create policy "Users can view own calendar events"
  on public.calendar_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own calendar events"
  on public.calendar_events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own calendar events"
  on public.calendar_events for update
  using (auth.uid() = user_id);

create policy "Users can delete own calendar events"
  on public.calendar_events for delete
  using (auth.uid() = user_id);

-- Add to publication for realtime
alter publication supabase_realtime add table public.calendar_events;
