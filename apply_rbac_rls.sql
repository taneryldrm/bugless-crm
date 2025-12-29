-- RBAC SECURITY UPDATE
-- Run this in Supabase SQL Editor

-- 1. Ensure Roles are correctly defined
-- Roles: 'Admin', 'Yönetici', 'Mühendis'

-- 2. TRANSACTIONS Security (Financial Data)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Financial visibility for Admin and Manager" ON public.transactions;
CREATE POLICY "Financial visibility for Admin and Manager" ON public.transactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'Admin' OR profiles.role = 'Yönetici')
  )
);

DROP POLICY IF EXISTS "Financial mutation for Admin and Manager" ON public.transactions;
CREATE POLICY "Financial mutation for Admin and Manager" ON public.transactions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'Admin' OR profiles.role = 'Yönetici')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'Admin' OR profiles.role = 'Yönetici')
  )
);

-- 3. WORK_SESSIONS Security (Session Deletion)
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin only session delete" ON public.work_sessions;
CREATE POLICY "Admin only session delete" ON public.work_sessions
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Admin'
  )
);

-- Note: Engineers/Managers still need to be able to create sessions and see their own/others (as per current app logic)
DROP POLICY IF EXISTS "Enable select for all authenticated users" ON public.work_sessions;
CREATE POLICY "Enable select for all authenticated users" ON public.work_sessions
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.work_sessions;
CREATE POLICY "Enable insert for authenticated users" ON public.work_sessions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. PROPOSALS Security (Standardizing for consistency)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access for Admin and Manager" ON public.proposals;
CREATE POLICY "Full access for Admin and Manager" ON public.proposals
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'Admin' OR profiles.role = 'Yönetici')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (profiles.role = 'Admin' OR profiles.role = 'Yönetici')
  )
);

-- Engineers should still see proposals? Or only their own?
-- Requested: "Manager and Admin will access all pages. Engineer cannot access finance."
-- So Engineer CAN see proposals.
DROP POLICY IF EXISTS "Engineer can see and create proposals" ON public.proposals;
CREATE POLICY "Engineer can see and create proposals" ON public.proposals
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Mühendis'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Mühendis'
  )
);
