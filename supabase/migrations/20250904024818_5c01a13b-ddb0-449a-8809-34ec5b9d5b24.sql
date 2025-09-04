-- Add delete policies that were missing
create policy "delete tasks" on public.tasks
for delete using (
  created_by = auth.uid() or 
  public.check_team_admin(team_id, auth.uid())
);

create policy "delete subtasks" on public.subtasks
for delete using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id and (
      t.created_by = auth.uid() or 
      public.check_team_admin(t.team_id, auth.uid())
    )
  )
);

create policy "delete team membership" on public.team_members
for delete using (
  user_id = auth.uid() or
  public.check_team_admin(team_id, auth.uid())
);