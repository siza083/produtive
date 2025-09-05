-- Função para obter o nome real do usuário do auth.users
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT au.raw_user_meta_data->>'name' FROM auth.users au WHERE au.id = user_uuid),
    (SELECT au.raw_user_meta_data->>'full_name' FROM auth.users au WHERE au.id = user_uuid),
    (SELECT split_part(au.email, '@', 1) FROM auth.users au WHERE au.id = user_uuid),
    'Usuário'
  );
$$;