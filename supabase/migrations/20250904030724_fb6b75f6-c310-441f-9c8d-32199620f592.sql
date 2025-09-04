-- Re-enable RLS on teams table and fix foreign key relationships
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraint between subtasks and profiles for assignee
ALTER TABLE public.subtasks 
ADD CONSTRAINT fk_subtasks_assignee 
FOREIGN KEY (assignee_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Add foreign key constraint between subtasks and tasks  
ALTER TABLE public.subtasks 
ADD CONSTRAINT fk_subtasks_task 
FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

-- Add foreign key constraint between tasks and teams
ALTER TABLE public.tasks 
ADD CONSTRAINT fk_tasks_team 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add foreign key constraint between team_members and teams
ALTER TABLE public.team_members 
ADD CONSTRAINT fk_team_members_team 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Recreate proper teams insert policy
DROP POLICY IF EXISTS "insert team" ON public.teams;

CREATE POLICY "insert team" ON public.teams
FOR INSERT 
WITH CHECK (created_by = auth.uid());