-- Create company_settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT DEFAULT 'Bugless Digital',
    email TEXT DEFAULT 'info@buglessdigital.com',
    phone TEXT DEFAULT '+90 212 123 45 67',
    address TEXT DEFAULT 'Maslak, Sarıyer, İstanbul',
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Initial data if table is empty
INSERT INTO public.company_settings (id, name, email, phone, address)
SELECT uuid_generate_v4(), 'Bugless Digital', 'info@buglessdigital.com', '+90 212 123 45 67', 'Maslak, Sarıyer, İstanbul'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- Policies
CREATE POLICY "Anyone authenticated can view company settings"
ON public.company_settings FOR SELECT
TO authenticated
USING (true);

-- is_admin helper might already exist in other files, but ensuring it works here
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'Yönetici'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can update company settings"
ON public.company_settings FOR ALL
TO authenticated
USING (is_admin());
