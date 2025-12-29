
-- BUGLESS CRM: MASTER DATABASE REPAIR SCRIPT (v4)
-- This script fixes "Permission Denied (42501)", "Infinite Recursion", and "Multiple Admin" issues.

-- 1. RESET PERMISSIONS (The core fix for 42501)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 2. CLEANUP OLD LOGIC
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.is_admin CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role CASCADE;

-- 3. CREATE ROLE CHECKER (Standardized and Safe)
-- This function checks the role WITHOUT using RLS to avoid loops.
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Yönetici'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. IMPROVED TRIGGER: Automatic Profile Creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, avatar_url, created_at)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
    new.email, 
    COALESCE(
      new.raw_user_meta_data->>'role', 
      CASE WHEN new.email = 'sumeyye@bugless.com' THEN 'Yönetici' ELSE 'Mühendis' END
    ),
    new.raw_user_meta_data->>'avatar_url', 
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. RECONSTRUCT RLS POLICIES (Simplified and Robust)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clear all existing policies to avoid duplicates/conflicts
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- Policy 1: Authenticated users can SEE ALL profiles (Necessary for Staff list and Project Managers)
CREATE POLICY "authenticated_select_all" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Policy 2: Admins can do ANYTHING (Manage users, update roles)
CREATE POLICY "admin_all_access" 
ON public.profiles FOR ALL 
TO authenticated 
USING (is_admin());

-- Policy 3: Users can update their OWN basic info (Full name, avatar)
CREATE POLICY "user_update_self" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. ENSURE SUMEYYE IS ADMIN (Emergency Backfill)
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT id, 'Sümeyye Şencan', email, 'Yönetici', created_at
FROM auth.users 
WHERE email = 'sumeyye@bugless.com'
ON CONFLICT (id) DO UPDATE SET role = 'Yönetici';

-- 8. TABLE STRUCTURE FIXES (Ensuring Array Support for Multi-Assignee)
-- This fixes the "op ANY/ALL (array) requires array on right side" error.
DO $$ 
BEGIN 
  -- Drop foreign key constraints if they exist (they prevent type change to uuid[])
  ALTER TABLE IF EXISTS public.external_tasks DROP CONSTRAINT IF EXISTS "external_tasks_assigned_to_fkey";
  ALTER TABLE IF EXISTS public.work_orders DROP CONSTRAINT IF EXISTS "work_orders_assigned_to_fkey";

  -- Fix external_tasks.assigned_to
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'external_tasks' AND column_name = 'assigned_to' AND data_type = 'uuid') THEN
    ALTER TABLE public.external_tasks ALTER COLUMN assigned_to TYPE uuid[] USING ARRAY[assigned_to];
  END IF;

  -- Fix work_orders.assigned_to
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_orders' AND column_name = 'assigned_to' AND data_type = 'uuid') THEN
    ALTER TABLE public.work_orders ALTER COLUMN assigned_to TYPE uuid[] USING ARRAY[assigned_to];
  END IF;
END $$;

-- 9. TASK RLS POLICIES (Allowing users to see and create tasks)
ALTER TABLE public.external_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own external_tasks" ON public.external_tasks;
CREATE POLICY "Users manage own external_tasks" 
ON public.external_tasks FOR ALL 
TO authenticated 
USING (auth.uid() = ANY(assigned_to) OR is_admin())
WITH CHECK (true); -- Allow insertion of new tasks

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view assigned work_orders" ON public.work_orders;
CREATE POLICY "Users view assigned work_orders" 
ON public.work_orders FOR SELECT 
TO authenticated 
USING (auth.uid() = ANY(assigned_to) OR is_admin());

-- 10. UNIFIED DASHBOARD TASKS (Work Orders + External Tasks)
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
      e.id, e.title, e.description, e.status, NULL::DATE as due_date, 'Harici Görev'::TEXT as source_type, e.created_at
    FROM public.external_tasks e
    WHERE (auth.uid() = ANY(e.assigned_to) OR e.assigned_to IS NULL) AND e.status != 'Tamamlandı'
  )
  ORDER BY created_at DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 11. RESET PERMISSIONS (Final Sweep)
GRANT EXECUTE ON FUNCTION public.get_my_dashboard_tasks() TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;

-- FINAL CHECK & REFRESH CACHE
NOTIFY pgrst, 'reload schema';
SELECT 'BAŞARILI: Veritabanı yapısı, İzinler ve Görev Motoru Senkronize Edildi!' as sonuc;
