-- REVISED CLIENT BALANCE CALCULATION RPC (v2)
-- Correct Logic:
-- Total Agreed = Sum of all project prices for the client
-- Total Paid = Sum of all income transactions linked to the client (by project or name)
-- Balance = Agreed - Paid (Positive: Debt, Negative: Advance/Credit)

CREATE OR REPLACE FUNCTION public.get_client_balances()
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    total_agreed NUMERIC,
    total_paid NUMERIC,
    balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH client_base_stats AS (
        SELECT 
            c.id as c_id,
            c.name as c_name,
            -- Calculate Total Project Value
            COALESCE((
                SELECT SUM(p.price) 
                FROM public.projects p 
                WHERE p.client_id = c.id
            ), 0) as agreed,
            -- Calculate Total Payments Received
            COALESCE((
                SELECT SUM(t.amount)
                FROM public.transactions t
                WHERE t.type = 'income' 
                AND (
                    -- Linked by project
                    t.project_id IN (SELECT p2.id FROM public.projects p2 WHERE p2.client_id = c.id)
                    OR 
                    -- Linked by name match
                    LOWER(TRIM(t.payer)) = LOWER(TRIM(c.name))
                )
            ), 0) as paid
        FROM public.clients c
    )
    SELECT 
        c_id,
        c_name,
        agreed::NUMERIC,
        paid::NUMERIC,
        (agreed - paid)::NUMERIC as balance
    FROM client_base_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant access
GRANT EXECUTE ON FUNCTION public.get_client_balances() TO authenticated;
