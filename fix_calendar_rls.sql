-- 1. Enable RLS (just in case)
alter table calendar_events enable row level security;

-- 2. Drop existing policies to ensure clean slate
drop policy if exists "Users can view their own events" on calendar_events;
drop policy if exists "Users can insert their own events" on calendar_events;
drop policy if exists "Users can update their own events" on calendar_events;
drop policy if exists "Users can delete their own events" on calendar_events;

-- 3. Recreate Policies
create policy "Users can view their own events" 
on calendar_events for select 
using (auth.uid() = user_id);

create policy "Users can insert their own events" 
on calendar_events for insert 
with check (auth.uid() = user_id);

create policy "Users can update their own events" 
on calendar_events for update 
using (auth.uid() = user_id);

create policy "Users can delete their own events" 
on calendar_events for delete 
using (auth.uid() = user_id);

-- 4. Ensure Realtime is enabled
alter publication supabase_realtime add table calendar_events;
