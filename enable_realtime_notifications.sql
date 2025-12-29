-- Enable Realtime for Notifications Table
-- This is required for the application to receive instant updates without refreshing.

BEGIN;
  -- Add the 'notifications' table to the 'supabase_realtime' publication
  -- This tells Supabase to broadcast changes (INSERT/UPDATE/DELETE) to connected clients.
  
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

COMMIT;
