-- Add delete policies for proposals and proposal_items
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- Proposals policies
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.proposals;
CREATE POLICY "Enable delete for authenticated users" ON public.proposals
FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.proposals;
CREATE POLICY "Enable select for authenticated users" ON public.proposals
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.proposals;
CREATE POLICY "Enable insert for authenticated users" ON public.proposals
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.proposals;
CREATE POLICY "Enable update for authenticated users" ON public.proposals
FOR UPDATE TO authenticated USING (true);

-- Proposal Items policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.proposal_items;
CREATE POLICY "Enable all for authenticated users" ON public.proposal_items
FOR ALL TO authenticated USING (true) WITH CHECK (true);
