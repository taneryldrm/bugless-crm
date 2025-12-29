
-- Update the AUTO-DELAY logic with more robust timezone handling
CREATE OR REPLACE FUNCTION public.check_and_update_delayed_tasks()
RETURNS VOID AS $$
DECLARE
    today_date DATE;
BEGIN
    -- Explicitly get the date for Turkey timezone
    today_date := (now() AT TIME ZONE 'Europe/Istanbul')::date;

    -- Update Work Orders
    UPDATE public.work_orders
    SET status = 'Geciken'
    WHERE due_date < today_date
    AND status NOT IN ('Tamamlandı', 'İptal', 'Geciken');

    -- Update External Tasks
    UPDATE public.external_tasks
    SET status = 'Geciken'
    WHERE due_date < today_date
    AND status NOT IN ('Tamamlandı', 'İptal', 'Geciken');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_and_update_delayed_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_update_delayed_tasks() TO anon;
