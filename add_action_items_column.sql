DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'meeting_notes' 
        AND column_name = 'action_items'
    ) THEN
        ALTER TABLE public.meeting_notes ADD COLUMN action_items TEXT[] DEFAULT '{}';
    END IF;
END $$;
