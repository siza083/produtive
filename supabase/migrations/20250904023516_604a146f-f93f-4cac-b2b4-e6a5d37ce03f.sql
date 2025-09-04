-- Drop existing trigger and function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Create improved function to handle new user registration
create or replace function public.handle_new_user()
returns trigger language plpgsql 
security definer set search_path = public
as $$
begin
  -- Insert into profiles with proper error handling
  insert into public.profiles (user_id, name, timezone, theme)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name', 
      split_part(new.email, '@', 1)
    ),
    'America/Sao_Paulo',
    'system'
  )
  on conflict (user_id) do nothing; -- Prevent duplicate entries
  
  return new;
exception
  when others then
    -- Log error but don't prevent user creation
    raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
    return new;
end;$$;

-- Create trigger for automatic profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ensure RLS is properly configured for profiles
alter table public.profiles enable row level security;

-- Update profile policies to be more permissive for inserts
drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
for insert with check (user_id = auth.uid());

-- Also allow the trigger to insert profiles
drop policy if exists "trigger can insert profiles" on public.profiles;
create policy "trigger can insert profiles" on public.profiles
for insert with check (true);