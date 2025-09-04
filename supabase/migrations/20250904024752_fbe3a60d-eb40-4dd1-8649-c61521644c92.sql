-- Fix infinite recursion in team_members policies
-- Drop all existing policies for team_members
drop policy if exists "select my memberships" on public.team_members;
drop policy if exists "insert team member" on public.team_members;
drop policy if exists "update team member" on public.team_members;

-- Create security definer function to check team membership
create or replace function public.check_team_membership(team_uuid uuid, user_uuid uuid)
returns boolean language sql 
security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = team_uuid 
      and tm.user_id = user_uuid 
      and tm.status = 'accepted'
  );
$$;

-- Create security definer function to check if user is team owner/admin
create or replace function public.check_team_admin(team_uuid uuid, user_uuid uuid)
returns boolean language sql 
security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = team_uuid 
      and tm.user_id = user_uuid 
      and tm.role in ('owner', 'admin')
      and tm.status = 'accepted'
  );
$$;

-- Recreate team_members policies without recursion
create policy "view own membership or team members" on public.team_members
for select using (
  user_id = auth.uid() or 
  public.check_team_membership(team_id, auth.uid())
);

create policy "insert team membership" on public.team_members
for insert with check (
  user_id = auth.uid() or
  exists (
    select 1 from public.teams t 
    where t.id = team_id and t.created_by = auth.uid()
  )
);

create policy "update team membership" on public.team_members
for update using (
  user_id = auth.uid() or
  public.check_team_admin(team_id, auth.uid())
);

-- Fix teams policies to use the helper functions
drop policy if exists "select teams as member" on public.teams;
drop policy if exists "insert team" on public.teams;
drop policy if exists "update own team" on public.teams;

create policy "select teams as member" on public.teams
for select using (
  public.check_team_membership(id, auth.uid())
);

create policy "insert team" on public.teams
for insert with check (created_by = auth.uid());

create policy "update team" on public.teams
for update using (
  created_by = auth.uid() or 
  public.check_team_admin(id, auth.uid())
);

-- Fix tasks policies
drop policy if exists "select tasks in my teams" on public.tasks;
drop policy if exists "insert task as member" on public.tasks;
drop policy if exists "update tasks" on public.tasks;

create policy "select tasks in my teams" on public.tasks
for select using (
  public.check_team_membership(team_id, auth.uid())
);

create policy "insert task as member" on public.tasks
for insert with check (
  public.check_team_membership(team_id, auth.uid())
);

create policy "update tasks" on public.tasks
for update using (
  created_by = auth.uid() or 
  public.check_team_admin(team_id, auth.uid())
);

-- Fix subtasks policies
drop policy if exists "select subtasks in my teams" on public.subtasks;
drop policy if exists "insert subtask as member" on public.subtasks;
drop policy if exists "update subtasks" on public.subtasks;

create policy "select subtasks in my teams" on public.subtasks
for select using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.check_team_membership(t.team_id, auth.uid())
  )
);

create policy "insert subtask as member" on public.subtasks
for insert with check (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.check_team_membership(t.team_id, auth.uid())
  )
);

create policy "update subtasks" on public.subtasks
for update using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and public.check_team_membership(t.team_id, auth.uid())
  )
);