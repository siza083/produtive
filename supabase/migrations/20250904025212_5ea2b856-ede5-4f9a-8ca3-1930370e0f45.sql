-- Fix the teams insert policy that's blocking team creation
drop policy if exists "insert team" on public.teams;

-- Create correct insert policy for teams
create policy "insert team" on public.teams
for insert with check (created_by = auth.uid());