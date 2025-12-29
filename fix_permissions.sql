-- 1. Grant table access to authenticated users (Crucial step often missed)
grant all on table calendar_events to authenticated;
grant all on table calendar_events to service_role;

-- 2. Ensure Sequence permissions (if any id generation uses sequences, though we use gen_random_uuid())
-- Just mostly safe to have
grant usage on schema public to authenticated;
grant usage on schema public to service_role;

-- 3. Verify Policies again (Preventive)
alter table calendar_events enable row level security;

-- (Re)create policies safely
do $$ 
begin
    if not exists (select from pg_policies where policyname = 'Users can view their own events') then
        create policy "Users can view their own events" on calendar_events for select using (auth.uid() = user_id);
    end if;

    if not exists (select from pg_policies where policyname = 'Users can insert their own events') then
        create policy "Users can insert their own events" on calendar_events for insert with check (auth.uid() = user_id);
    end if;

    if not exists (select from pg_policies where policyname = 'Users can update their own events') then
        create policy "Users can update their own events" on calendar_events for update using (auth.uid() = user_id);
    end if;

    if not exists (select from pg_policies where policyname = 'Users can delete their own events') then
        create policy "Users can delete their own events" on calendar_events for delete using (auth.uid() = user_id);
    end if;
end $$;
