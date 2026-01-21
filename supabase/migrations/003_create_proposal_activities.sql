-- ============================================
-- MIGRATION: Criar Tabela de Atividades
-- ============================================
-- Projeto: Sistema de Propostas Nobrecar
-- Data: 2025-01-28
-- Arquivo: 003_create_proposal_activities.sql
--
-- Descrição:
--   Cria a tabela proposal_activities para armazenar
--   anotações e atividades relacionadas a cada proposta.
--
-- Regras de Negócio:
--   - CRUD total para todos os usuários
--   - Real-time updates
--   - Sem atividades automáticas (por enquanto)
-- ============================================

-- Verificar se a tabela proposals existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'proposals') THEN
    RAISE EXCEPTION 'Tabela proposals não encontrada. Execute primeiro as migrations anteriores.';
  END IF;
END $$;

-- Criar tabela de atividades
CREATE TABLE IF NOT EXISTS proposal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Conteúdo da atividade
  description TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE proposal_activities IS 'Armazena atividades e anotações de cada proposta';
COMMENT ON COLUMN proposal_activities.description IS 'Conteúdo da atividade/anotação';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_activities_proposal_id ON proposal_activities(proposal_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON proposal_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON proposal_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_proposal_created ON proposal_activities(proposal_id, created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_proposal_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_proposal_activities_updated_at
  BEFORE UPDATE ON proposal_activities
  FOR EACH ROW
  EXECUTE FUNCTION update_proposal_activities_updated_at();

-- Verificação final
SELECT 
  'Tabela criada com sucesso!' as status,
  COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'proposal_activities';

-- Mensagem de sucesso
DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration 003 concluída com sucesso!';
  RAISE NOTICE '✅ Tabela proposal_activities criada';
  RAISE NOTICE '✅ Índices criados para performance';
  RAISE NOTICE '✅ Trigger de updated_at configurado';
  RAISE NOTICE '🚀 O sistema está pronto para gerenciar atividades!';
END $$;
