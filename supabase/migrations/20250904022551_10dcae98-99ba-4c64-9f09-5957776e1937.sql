-- Create function to handle new user registration
create or replace function public.handle_new_user()
returns trigger language plpgsql 
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, timezone, theme)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    'America/Sao_Paulo',
    'system'
  );
  return new;
end;$$;

-- Create trigger for automatic profile creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Grant necessary permissions
grant usage on schema auth to public;
grant select on table auth.users to public;