-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
ON public.notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Simple Trigger to Notify assignments (Optional but good)
-- For now, we will create a helper function to easily insert notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id UUID,
  title TEXT,
  message TEXT,
  link TEXT DEFAULT NULL,
  type TEXT DEFAULT 'info'
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link, type)
  VALUES (target_user_id, title, message, link, type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
