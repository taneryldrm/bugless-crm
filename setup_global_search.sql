DROP FUNCTION IF EXISTS global_search(text);

CREATE OR REPLACE FUNCTION global_search(search_term text)
RETURNS TABLE (
  id text,
  type text,
  title text,
  subtitle text,
  link text,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  -- Projects
  SELECT 
    p.id::text, 
    'Proje'::text as type, 
    p.name as title, 
    COALESCE(c.name, 'Müşteri Belirtilmemiş') as subtitle, 
    '/projects'::text as link, 
    p.created_at
  FROM projects p
  LEFT JOIN clients c ON p.client_id = c.id
  WHERE p.name ILIKE '%' || search_term || '%' 
     OR c.name ILIKE '%' || search_term || '%'
  
  UNION ALL
  
  -- Clients
  SELECT 
    clients.id::text, 
    'Müşteri'::text, 
    clients.name, 
    COALESCE(clients.phone, clients.type, 'Tür Belirtilmemiş'), 
    '/clients'::text, 
    clients.created_at
  FROM clients
  WHERE clients.name ILIKE '%' || search_term || '%' 
     OR clients.phone ILIKE '%' || search_term || '%'
  
  UNION ALL
  
  -- Work Orders
  SELECT 
    work_orders.id::text, 
    'İş Emri'::text, 
    work_orders.title, 
    LEFT(work_orders.description, 50) as subtitle, 
    '/work-orders'::text, 
    work_orders.created_at
  FROM work_orders
  WHERE work_orders.title ILIKE '%' || search_term || '%' 
     OR work_orders.description ILIKE '%' || search_term || '%'

  UNION ALL

  -- Profiles (Staff)
  SELECT 
    profiles.id::text, 
    'Personel'::text, 
    profiles.full_name, 
    COALESCE(profiles.role, 'Rol Yok'), 
    '/staff'::text, 
    profiles.updated_at as created_at
  FROM profiles
  WHERE profiles.full_name ILIKE '%' || search_term || '%' 
     OR profiles.email ILIKE '%' || search_term || '%'

  UNION ALL

  -- Transactions
  SELECT 
    transactions.id::text, 
    CASE WHEN transactions.type = 'income' THEN 'Gelir' ELSE 'Gider' END, 
    transactions.description, 
    transactions.amount::text || ' TL', 
    '/finance'::text, 
    transactions.created_at
  FROM transactions
  WHERE transactions.description ILIKE '%' || search_term || '%';
END;
$$;
