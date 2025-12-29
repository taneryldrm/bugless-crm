
-- Unified Task Engine Fix
-- 1. Support both NULL and empty array for unassigned tasks in Dashboard
CREATE OR REPLACE FUNCTION public.get_my_dashboard_tasks()
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    status TEXT,
    due_date DATE,
    source_type TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT 
      w.id, w.title, w.description, w.status, w.due_date, 'İş Emri'::TEXT as source_type, w.created_at
    FROM public.work_orders w
    WHERE (auth.uid() = ANY(w.assigned_to) OR w.assigned_to IS NULL OR cardinality(w.assigned_to) = 0) 
    AND w.status != 'Tamamlandı'
  )
  UNION ALL
  (
    SELECT 
      e.id, e.title, e.description, e.status, e.due_date, 'Harici Görev'::TEXT as source_type, e.created_at
    FROM public.external_tasks e
    WHERE (auth.uid() = ANY(e.assigned_to) OR e.assigned_to IS NULL OR cardinality(e.assigned_to) = 0) 
    AND e.status != 'Tamamlandı'
  )
  ORDER BY status = 'Geciken' DESC, due_date ASC, created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Ensure RLS is fully open for Harici Görevler for now to debug
DROP POLICY IF EXISTS "authenticated_all" ON public.external_tasks;
CREATE POLICY "authenticated_all" ON public.external_tasks FOR ALL TO authenticated USING (true);

-- 3. Ensure check_and_update_delayed_tasks is robust
CREATE OR REPLACE FUNCTION public.check_and_update_delayed_tasks()
RETURNS VOID AS $$
DECLARE
    today_date DATE;
BEGIN
    today_date := (now() AT TIME ZONE 'Europe/Istanbul')::date;

    UPDATE public.work_orders
    SET status = 'Geciken'
    WHERE due_date < today_date
    AND status NOT IN ('Tamamlandı', 'İptal', 'Geciken');

    UPDATE public.external_tasks
    SET status = 'Geciken'
    WHERE due_date < today_date
    AND status NOT IN ('Tamamlandı', 'İptal', 'Geciken');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_and_update_delayed_tasks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_update_delayed_tasks() TO anon;
