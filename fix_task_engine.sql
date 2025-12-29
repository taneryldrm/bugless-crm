
-- Update get_my_dashboard_tasks to include real due_date for external tasks
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
    WHERE auth.uid() = ANY(w.assigned_to) AND w.status != 'Tamamlandı'
  )
  UNION ALL
  (
    SELECT 
      e.id, e.title, e.description, e.status, e.due_date, 'Harici Görev'::TEXT as source_type, e.created_at
    FROM public.external_tasks e
    WHERE (auth.uid() = ANY(e.assigned_to) OR e.assigned_to IS NULL) AND e.status != 'Tamamlandı'
  )
  ORDER BY status = 'Geciken' DESC, due_date ASC, created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
