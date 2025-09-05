-- Atualizar perfis sem nome usando informações do auth.users
UPDATE public.profiles 
SET name = COALESCE(
  (SELECT au.raw_user_meta_data->>'name' FROM auth.users au WHERE au.id = profiles.user_id),
  (SELECT au.raw_user_meta_data->>'full_name' FROM auth.users au WHERE au.id = profiles.user_id), 
  (SELECT split_part(au.email, '@', 1) FROM auth.users au WHERE au.id = profiles.user_id),
  'Usuário'
)
WHERE name IS NULL OR trim(name) = '';

-- Adicionar trigger para garantir que novos usuários tenham nome
CREATE OR REPLACE FUNCTION public.ensure_profile_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o nome estiver vazio, usar informações do auth
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    SELECT COALESCE(
      NEW.name,
      (SELECT au.raw_user_meta_data->>'name' FROM auth.users au WHERE au.id = NEW.user_id),
      (SELECT au.raw_user_meta_data->>'full_name' FROM auth.users au WHERE au.id = NEW.user_id),
      (SELECT split_part(au.email, '@', 1) FROM auth.users au WHERE au.id = NEW.user_id),
      'Usuário'
    ) INTO NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger em INSERT e UPDATE
DROP TRIGGER IF EXISTS ensure_profile_name_trigger ON public.profiles;
CREATE TRIGGER ensure_profile_name_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_name();