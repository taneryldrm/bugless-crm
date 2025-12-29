-- FIX: Correct URL for External Tasks in Notifications
-- 1. update the Trigger Function with the correct path
CREATE OR REPLACE FUNCTION public.handle_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  assignee_id UUID;
  task_title TEXT;
  task_type TEXT;
  task_link TEXT;
BEGIN
  -- 1. Determine Task Type and Link
  IF TG_TABLE_NAME = 'work_orders' THEN
    task_title := NEW.title;
    task_type := 'İş Emri';
    task_link := '/work-orders';
  ELSIF TG_TABLE_NAME = 'external_tasks' THEN
    task_title := NEW.title;
    task_type := 'Harici Görev';
    task_link := '/external-tasks'; -- CORRECTION: Was '/tasks'
  END IF;

  -- 2. Loop through the "assigned_to" array
  IF NEW.assigned_to IS NOT NULL THEN
    FOREACH assignee_id IN ARRAY NEW.assigned_to
    LOOP
      IF (TG_OP = 'INSERT') OR 
         (TG_OP = 'UPDATE' AND (OLD.assigned_to IS NULL OR NOT (assignee_id = ANY(OLD.assigned_to)))) 
      THEN
          INSERT INTO public.notifications (user_id, title, message, link, type)
          VALUES (
            assignee_id,
            'Yeni Görev Ataması: ' || task_type,
            task_title || ' başlıklı görev size atandı.',
            task_link,
            'info'
          );
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Repair existing broken links in notifications table
UPDATE public.notifications
SET link = '/external-tasks'
WHERE link = '/tasks';
