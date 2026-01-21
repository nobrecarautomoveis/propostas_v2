-- ============================================
-- ADICIONAR STATUS "DEVOLVIDA" E "REANALISE"
-- Atualização do enum de status nas propostas
-- ============================================

-- 1. Remover constraint antigo
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check;

-- 2. Adicionar novo constraint com todos os status
ALTER TABLE proposals ADD CONSTRAINT proposals_status_check 
  CHECK (status IN ('Digitando', 'Em Análise', 'Aprovada', 'Recusada', 'Efetivada', 'Devolvida', 'Reanalise'));

-- 3. Comentário explicativo
COMMENT ON COLUMN proposals.status IS 'Status da proposta: Digitando, Em Análise, Aprovada, Recusada, Efetivada, Devolvida, Reanalise';
