-- Drop table if exists to ensure clean slate (Optional, be careful with data)
-- DROP TABLE IF EXISTS public.meeting_notes;

-- Create Meeting Notes Table
CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT now(),
  content TEXT, -- Rich text content
  attendees TEXT[], -- Array of staff names or IDs
  decisions TEXT[], -- List of decisions made
  
  -- Power Features
  type TEXT, -- 'Standup', 'Review', etc.
  duration INTEGER DEFAULT 0, -- Duration in seconds
  tags TEXT[], 
  efficiency_score INTEGER DEFAULT 0, 
  
  -- Relations
  project_id UUID REFERENCES public.projects(id),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- PERMISSIONS (CRITICAL FIX)
GRANT ALL ON TABLE public.meeting_notes TO postgres;
GRANT ALL ON TABLE public.meeting_notes TO anon;
GRANT ALL ON TABLE public.meeting_notes TO authenticated;
GRANT ALL ON TABLE public.meeting_notes TO service_role;

-- RLS Policies
ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read all notes" ON public.meeting_notes;
CREATE POLICY "Authenticated users can read all notes" 
ON public.meeting_notes FOR SELECT 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert notes" ON public.meeting_notes;
CREATE POLICY "Authenticated users can insert notes" 
ON public.meeting_notes FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update notes" ON public.meeting_notes;
CREATE POLICY "Authenticated users can update notes" 
ON public.meeting_notes FOR UPDATE 
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete notes" ON public.meeting_notes;
CREATE POLICY "Authenticated users can delete notes" 
ON public.meeting_notes FOR DELETE 
USING (auth.role() = 'authenticated');

-- Enable Realtime (Safe Block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'meeting_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meeting_notes;
  END IF;
END
$$;
