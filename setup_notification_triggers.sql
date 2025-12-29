-- TRIGGER FUNCTION: Handle New Assignments
-- This function runs automatically whenever a Work Order or External Task is created or updated.
-- It checks if a user has been assigned and creates a notification for them.

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
    task_link := '/tasks';
  END IF;

  -- 2. Loop through the "assigned_to" array
  IF NEW.assigned_to IS NOT NULL THEN
    FOREACH assignee_id IN ARRAY NEW.assigned_to
    LOOP
      -- 3. Check Condition:
      --    IF (Insert) OR (Update AND User was NOT in the old list)
      --    This prevents duplicate notifications if the task is updated but the assignee didn't change.
      
      IF (TG_OP = 'INSERT') OR 
         (TG_OP = 'UPDATE' AND (OLD.assigned_to IS NULL OR NOT (assignee_id = ANY(OLD.assigned_to)))) 
      THEN
          -- 4. Insert Notification
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
$$ LANGUAGE plpgsql SECURITY DEFINER; -- Runs as Admin to bypass RLS during Insert

-- 5. Bind Triggers to Tables

-- Work Orders Trigger
DROP TRIGGER IF EXISTS on_work_order_assigned ON public.work_orders;
CREATE TRIGGER on_work_order_assigned
AFTER INSERT OR UPDATE ON public.work_orders
FOR EACH ROW EXECUTE PROCEDURE public.handle_task_assignment();

-- External Tasks Trigger
DROP TRIGGER IF EXISTS on_external_task_assigned ON public.external_tasks;
CREATE TRIGGER on_external_task_assigned
AFTER INSERT OR UPDATE ON public.external_tasks
FOR EACH ROW EXECUTE PROCEDURE public.handle_task_assignment();
