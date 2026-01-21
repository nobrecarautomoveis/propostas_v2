-- ============================================
-- ADICIONAR STATUS "EFETIVADA"
-- Atualização do enum de status nas propostas
-- ============================================

-- Não é possível alterar diretamente um CHECK constraint em PostgreSQL
-- Precisamos remover o constraint antigo e criar um novo

-- 1. Remover constraint antigo
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;

-- 2. Adicionar novo constraint com "Efetivada"
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check 
  CHECK (status IN ('Digitando', 'Em Análise', 'Aprovada', 'Recusada', 'Efetivada'));

-- 3. Comentário explicativo
COMMENT ON COLUMN proposals.status IS 'Status da proposta: Digitando, Em Análise, Aprovada, Recusada, Efetivada';
