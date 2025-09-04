-- PROFILES --------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  photo_url text,
  timezone text default 'America/Sao_Paulo',
  theme text default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- TEAMS -----------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.teams enable row level security;

create table if not exists public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  status text not null default 'accepted' check (status in ('pending','accepted')),
  invited_email text,
  joined_at timestamptz default now(),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

-- TASKS (PASTAS) -------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.tasks enable row level security;

-- SUBTASKS (ATIVIDADES) ------------------------------------
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  assignee_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open','done')),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

alter table public.subtasks enable row level security;

-- NOTIFICATIONS --------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subtask_id uuid references public.subtasks(id) on delete cascade,
  type text not null check (type in ('assigned')),
  created_at timestamptz default now(),
  read_at timestamptz
);

alter table public.notifications enable row level security;

-- TRIGGERS E REGRAS ----------------------------------------

-- completed_at trigger
create or replace function public.set_completed_at()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'done' and (OLD.status is distinct from 'done') then
    NEW.completed_at := now();
  elsif NEW.status = 'open' and (OLD.status is distinct from 'open') then
    NEW.completed_at := null;
  end if;
  return NEW;
end;$$;

create trigger trg_set_completed_at
before update on public.subtasks
for each row execute function public.set_completed_at();

-- notification on assign trigger
create or replace function public.notify_on_assign()
returns trigger language plpgsql as $$
begin
  if NEW.assignee_id is not null and (OLD.assignee_id is distinct from NEW.assignee_id) then
    insert into public.notifications(user_id, subtask_id, type)
    values (NEW.assignee_id, NEW.id, 'assigned');
  end if;
  return NEW;
end;$$;

create trigger trg_notify_on_assign
after insert or update of assignee_id on public.subtasks
for each row execute function public.notify_on_assign();

-- POLÍTICAS RLS ---------------------------------------------

-- PROFILES: cada um só enxerga seu próprio profile
create policy "select own profile" on public.profiles
for select using (user_id = auth.uid());

create policy "insert own profile" on public.profiles
for insert with check (user_id = auth.uid());

create policy "update own profile" on public.profiles
for update using (user_id = auth.uid());

-- TEAMS: visível apenas para membros aceitos
create policy "select teams as member" on public.teams
for select using (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = id and tm.user_id = auth.uid() and tm.status = 'accepted'
  )
);

create policy "insert team" on public.teams
for insert with check (created_by = auth.uid());

create policy "update own team" on public.teams
for update using (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = id and tm.user_id = auth.uid() and tm.role in ('owner','admin') and tm.status = 'accepted'
  )
);

-- TEAM_MEMBERS
create policy "select my memberships" on public.team_members
for select using (user_id = auth.uid() or exists (
  select 1 from public.team_members tm
  where tm.team_id = team_id and tm.user_id = auth.uid() and tm.status='accepted'
));

create policy "insert team member" on public.team_members
for insert with check (
  exists (
    select 1 from public.teams t
    where t.id = team_id and t.created_by = auth.uid()
  ) or user_id = auth.uid()
);

create policy "update team member" on public.team_members
for update using (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_id and tm.user_id = auth.uid() and tm.role in ('owner','admin') and tm.status = 'accepted'
  )
);

-- TASKS: somente membros do team
create policy "select tasks in my teams" on public.tasks
for select using (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_id and tm.user_id = auth.uid() and tm.status='accepted'
  )
);

create policy "insert task as member" on public.tasks
for insert with check (
  exists (
    select 1 from public.team_members tm
    where tm.team_id = team_id and tm.user_id = auth.uid() and tm.status='accepted'
  )
);

create policy "update tasks" on public.tasks
for update using (
  created_by = auth.uid() or exists (
    select 1 from public.team_members tm
    where tm.team_id = team_id and tm.user_id = auth.uid() and tm.role in ('owner','admin') and tm.status='accepted'
  )
);

-- SUBTASKS: somente membros do team da task
create policy "select subtasks in my teams" on public.subtasks
for select using (
  exists (
    select 1 from public.tasks t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = task_id and tm.user_id = auth.uid() and tm.status='accepted'
  )
);

create policy "insert subtask as member" on public.subtasks
for insert with check (
  exists (
    select 1 from public.tasks t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = task_id and tm.user_id = auth.uid() and tm.status='accepted'
  )
);

create policy "update subtasks" on public.subtasks
for update using (
  exists (
    select 1 from public.tasks t
    join public.team_members tm on tm.team_id = t.team_id
    where t.id = task_id and tm.user_id = auth.uid() and tm.status='accepted'
  )
);

-- NOTIFICATIONS: dono da notificação
create policy "select my notifications" on public.notifications
for select using (user_id = auth.uid());

create policy "update my notifications" on public.notifications
for update using (user_id = auth.uid());

create policy "insert notifications" on public.notifications
for insert with check (true);