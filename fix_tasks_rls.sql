-- FIX EXTERNAL TASKS AND WORK ORDERS RLS
-- Allow all authenticated users (Admin, Yönetici, Mühendis) to manage tasks

-- 1. EXTERNAL TASKS
ALTER TABLE public.external_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to external_tasks" ON public.external_tasks;
DROP POLICY IF EXISTS "Staff can view external_tasks" ON public.external_tasks;
DROP POLICY IF EXISTS "Full access for Admin and Manager on external_tasks" ON public.external_tasks;
DROP POLICY IF EXISTS "Full access for all on external_tasks" ON public.external_tasks;

CREATE POLICY "Full access for all on external_tasks" 
ON public.external_tasks 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 2. WORK ORDERS
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Staff can view work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Full access for Admin and Manager on work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Full access for all on work_orders" ON public.work_orders;

CREATE POLICY "Full access for all on work_orders" 
ON public.work_orders 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
