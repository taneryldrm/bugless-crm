-- 1. Project Subtasks (Checklists)
create table if not exists project_subtasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  title text not null,
  is_completed boolean default false,
  assigned_to uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 2. Project Files (Attachments)
create table if not exists project_files (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  url text not null,
  type text default 'link', -- 'file' or 'link'
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 3. Project Activity (Comments & Logs)
create table if not exists project_activity (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references auth.users(id),
  message text not null,
  type text default 'comment', -- 'comment', 'log', 'status_change'
  created_at timestamptz default now()
);

-- 4. Enable RLS
alter table project_subtasks enable row level security;
alter table project_files enable row level security;
alter table project_activity enable row level security;

-- 5. Policies (Simple: Authenticated users can do everything on these project related tables for now)
-- Subtasks
create policy "Users can view subtasks" on project_subtasks for select using (auth.role() = 'authenticated');
create policy "Users can insert subtasks" on project_subtasks for insert with check (auth.role() = 'authenticated');
create policy "Users can update subtasks" on project_subtasks for update using (auth.role() = 'authenticated');
create policy "Users can delete subtasks" on project_subtasks for delete using (auth.role() = 'authenticated');

-- Files
create policy "Users can view files" on project_files for select using (auth.role() = 'authenticated');
create policy "Users can insert files" on project_files for insert with check (auth.role() = 'authenticated');
create policy "Users can delete files" on project_files for delete using (auth.role() = 'authenticated');

-- Activity
create policy "Users can view activity" on project_activity for select using (auth.role() = 'authenticated');
create policy "Users can insert activity" on project_activity for insert with check (auth.role() = 'authenticated');

-- 6. Realtime
alter publication supabase_realtime add table project_subtasks;
alter publication supabase_realtime add table project_files;
alter publication supabase_realtime add table project_activity;

-- 7. Grant Permissions (Crucial for new tables)
grant all on table project_subtasks to authenticated;
grant all on table project_files to authenticated;
grant all on table project_activity to authenticated;

grant all on table project_subtasks to service_role;
grant all on table project_files to service_role;
grant all on table project_activity to service_role;
