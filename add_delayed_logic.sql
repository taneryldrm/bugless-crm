
-- 1. Ensure external_tasks has due_date column
ALTER TABLE public.external_tasks ADD COLUMN IF NOT EXISTS due_date DATE;

-- 2. Create the AUTO-DELAY logic function
-- This function can be called by the frontend or set up as a cron.
-- It moves tasks to 'Geciken' if the due_date is in the past and they aren't completed.
CREATE OR REPLACE FUNCTION public.check_and_update_delayed_tasks()
RETURNS VOID AS $$
BEGIN
    -- Update Work Orders
    UPDATE public.work_orders
    SET status = 'Geciken'
    WHERE due_date < CURRENT_DATE
    AND status NOT IN ('Tamamlandı', 'İptal', 'Geciken');

    -- Update External Tasks
    UPDATE public.external_tasks
    SET status = 'Geciken'
    WHERE due_date < CURRENT_DATE
    AND status NOT IN ('Tamamlandı', 'İptal', 'Geciken');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_and_update_delayed_tasks() TO authenticated;

-- 4. Initial Run
SELECT public.check_and_update_delayed_tasks();
