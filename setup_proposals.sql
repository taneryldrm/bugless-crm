-- 1. Proposals Table
create table if not exists proposals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  client_id uuid references clients(id),
  title text not null, -- e.g. "Web Design Proposal"
  proposal_number serial, -- Auto-increment number
  
  -- Financials
  currency text default 'TRY',
  tax_rate numeric default 20, -- %20 KDV
  total_amount numeric default 0,
  
  -- Status & Dates
  status text default 'Taslak', -- Taslak, Gönderildi, Onaylandı, Reddedildi
  valid_until date,
  created_at timestamptz default now(),
  
  -- Public Access Logic
  access_token uuid default gen_random_uuid(), -- Secret key for the link
  view_count int default 0,
  last_viewed_at timestamptz,
  client_ip text
);

-- 2. Proposal Items (Line Items)
create table if not exists proposal_items (
  id uuid default gen_random_uuid() primary key,
  proposal_id uuid references proposals(id) on delete cascade,
  description text not null,
  quantity numeric default 1,
  unit_price numeric default 0,
  amount numeric GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 3. RLS Policies
alter table proposals enable row level security;
alter table proposal_items enable row level security;

-- Admin/User can do everything their own proposals
create policy "Users manage own proposals" on proposals 
  for all using (auth.uid() = user_id);

create policy "Users manage own proposal items" on proposal_items 
  for all using (
    exists (select 1 from proposals where id = proposal_items.proposal_id and user_id = auth.uid())
  );

-- PUBLIC ACCESS (The Tricky Part)
-- We do NOT grant broad SELECT permissions to 'anon'.
-- Instead we use SECURITY DEFINER functions for specific public actions.

-- 4. Secure Function: Get Proposal by Token (For Public View)
create or replace function get_proposal_public(token_input uuid)
returns json
language plpgsql
security definer 
as $$
declare
  result json;
begin
  -- Update view stats silently
  update proposals set 
    view_count = view_count + 1, 
    last_viewed_at = now() 
  where access_token = token_input;

  -- Return data
  select json_build_object(
    'proposal', p,
    'items', (select json_agg(i) from proposal_items i where i.proposal_id = p.id),
    'client', (select name from clients c where c.id = p.client_id)
  ) into result
  from proposals p
  where p.access_token = token_input;
  
  return result;
end;
$$;

-- 5. Secure Function: Approve Proposal (Digital Signature)
create or replace function approve_proposal_public(token_input uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  target_id uuid;
begin
  -- Find proposal
  select id into target_id from proposals where access_token = token_input and status != 'Onaylandı';
  
  if target_id is null then
    return false;
  end if;

  -- Update status
  update proposals 
  set status = 'Onaylandı' 
  where id = target_id;
  
  -- Here we could trigger auto-project creation logic if we wanted, 
  -- but we'll stick to simple status update first.
  
  return true;
end;
$$;

-- 6. Realtime
alter publication supabase_realtime add table proposals;

-- Grants
grant all on proposals to authenticated;
grant all on proposals to service_role;
grant all on proposal_items to authenticated;
grant all on proposal_items to service_role;

-- Grants for Sequences (CRITICAL for serial columns)
grant usage, select on sequence proposals_proposal_number_seq to authenticated;
grant usage, select on sequence proposals_proposal_number_seq to service_role;
