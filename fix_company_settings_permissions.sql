-- FIX: Allow all authenticated users to manage company settings
-- And fix permission denied error

-- 1. Ensure table exists and has grants
GRANT ALL ON TABLE public.company_settings TO authenticated;
GRANT ALL ON TABLE public.company_settings TO service_role;
GRANT SELECT ON TABLE public.company_settings TO anon;

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone authenticated can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
DROP POLICY IF EXISTS "All authenticated users can manage settings" ON public.company_settings;

-- 3. Create a universal policy for authenticated users as requested
CREATE POLICY "All authenticated users can manage settings"
ON public.company_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Initial data if missing
INSERT INTO public.company_settings (name, email, phone, address)
SELECT 'Bugless Digital', 'info@buglessdigital.com', '+90 212 123 45 67', 'Maslak, Sarıyer, İstanbul'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
