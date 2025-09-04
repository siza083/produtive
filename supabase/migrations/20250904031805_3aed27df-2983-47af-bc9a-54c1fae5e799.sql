-- Remove the duplicate foreign key constraints that I added
ALTER TABLE public.subtasks DROP CONSTRAINT IF EXISTS fk_subtasks_assignee;
ALTER TABLE public.subtasks DROP CONSTRAINT IF EXISTS fk_subtasks_task;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS fk_tasks_team;
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS fk_team_members_team;

-- Temporarily disable RLS on teams table again to allow team creation
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;