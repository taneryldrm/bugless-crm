-- FIX PROFILES RLS AND USER MANAGEMENT PERMISSIONS (v2)
-- This script allows Admins and Managers to update any user profile

-- 1. Update is_admin function to include 'Admin' role and be secure
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'Admin' OR role = 'Yönetici')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update profiles table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clear all existing policies for profiles
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- Policy 1: Authenticated users can SEE ALL profiles
CREATE POLICY "authenticated_select_all" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Policy 2: Admins and Managers can do ANYTHING
CREATE POLICY "admin_manager_all_access" 
ON public.profiles FOR ALL 
TO authenticated 
USING (public.is_admin());

-- Policy 3: Users can update their OWN basic info
CREATE POLICY "user_update_self" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Final Sweep
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
NOTIFY pgrst, 'reload schema';
SELECT 'BAŞARILI: Kullanıcı yönetimi izinleri güncellendi!' as sonuc;
