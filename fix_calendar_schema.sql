-- Add end_time column if it's missing
alter table calendar_events add column if not exists end_time timestamptz;

-- Ensure other columns exist too, just in case
alter table calendar_events add column if not exists start_time timestamptz;
alter table calendar_events add column if not exists title text;
alter table calendar_events add column if not exists description text;
alter table calendar_events add column if not exists type text default 'event';
alter table calendar_events add column if not exists priority text default 'Normal';
alter table calendar_events add column if not exists user_id uuid references auth.users(id);

-- Refresh the schema cache by reloading the schema
notify pgrst, 'reload schema';
