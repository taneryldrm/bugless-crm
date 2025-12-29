-- RUN THIS IN SUPABASE SQL EDITOR TO FIX CALENDAR COMPLETION
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- Also ensure RLS is correct for this column
-- (Assuming public.calendar_events already has RLS enabled from schema)
NOTIFY pgrst, 'reload schema';
