-- FIX: Add missing 'link' column to notifications table
-- This script safely checks if the column exists and adds it if not.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'link'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN link TEXT;
    END IF;
END $$;

-- Also ensure RLS is enabled just in case
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Refresh permissions
GRANT ALL ON public.notifications TO authenticated;
