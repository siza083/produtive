-- Adicionar campo de prioridade na tabela subtasks
-- Criar o tipo de prioridade se ainda não existir
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subtask_priority') THEN
    CREATE TYPE public.subtask_priority AS ENUM ('low','medium','high');
  END IF;
END $$;

-- Adicionar coluna 'priority' (padrão: 'medium')
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS priority public.subtask_priority NOT NULL DEFAULT 'medium';

-- Índice auxiliar para ordenações
CREATE INDEX IF NOT EXISTS idx_subtasks_priority ON public.subtasks(priority);