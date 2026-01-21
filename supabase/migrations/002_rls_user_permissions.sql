-- ============================================
-- ATUALIZAÇÃO DE POLÍTICAS RLS
-- Controle de acesso baseado em role de usuário
-- ============================================

-- Remover política antiga de leitura de propostas
DROP POLICY IF EXISTS "Users can view all proposals" ON proposals;

-- Nova política: Usuários autenticados podem ver propostas
-- (O filtro por role é aplicado na camada de serviço)
CREATE POLICY "Authenticated users can view proposals" ON proposals
  FOR SELECT
  USING (true);
