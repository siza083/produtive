-- Drop and recreate the teams insert policy with better debugging
drop policy if exists "insert team" on public.teams;

-- Create a more permissive policy for debugging
create policy "insert team" on public.teams
for insert with check (
  auth.uid() is not null and 
  created_by = auth.uid()
);

-- Also ensure we have all necessary policies for team_members
drop policy if exists "insert team membership" on public.team_members;

create policy "insert team membership" on public.team_members
for insert with check (
  auth.uid() is not null and (
    user_id = auth.uid() or
    exists (
      select 1 from public.teams t 
      where t.id = team_id and t.created_by = auth.uid()
    )
  )
);