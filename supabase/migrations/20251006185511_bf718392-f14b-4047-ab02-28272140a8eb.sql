-- Primeiro, remover a constraint antiga se existir
ALTER TABLE public.subtasks 
DROP CONSTRAINT IF EXISTS subtasks_status_check;

-- Atualizar todos os status 'open' existentes para 'todo'
UPDATE public.subtasks 
SET status = 'todo' 
WHERE status = 'open';

-- Atualizar todos os status 'done' que não devem mudar permanecem 'done'
-- (não precisa fazer nada, eles já estão corretos)

-- Adicionar a nova constraint com os novos valores permitidos
ALTER TABLE public.subtasks 
ADD CONSTRAINT subtasks_status_check 
CHECK (status IN ('todo', 'in_progress', 'done', 'waiting_client'));

-- Alterar o valor padrão para 'todo'
ALTER TABLE public.subtasks 
ALTER COLUMN status SET DEFAULT 'todo';