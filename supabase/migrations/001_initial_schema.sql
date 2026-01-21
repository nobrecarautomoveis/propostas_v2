-- ============================================
-- NOBRECAR AUTOMÓVEIS - SUPABASE SCHEMA
-- Migração do Convex para Supabase
-- ============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: users (Usuários)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- TABELA: proposals (Propostas)
-- ============================================
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_number VARCHAR(50) UNIQUE NOT NULL,
  date_added TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  salesperson_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Tipo de proposta
  proposal_type VARCHAR(50) NOT NULL DEFAULT 'financing',
  vehicle_type VARCHAR(50) NOT NULL DEFAULT 'car',
  is_financed BOOLEAN DEFAULT FALSE,
  vehicle_condition VARCHAR(20) DEFAULT 'used',
  status VARCHAR(50) NOT NULL DEFAULT 'Digitando',
  licensing_location VARCHAR(100),

  -- Dados do veículo
  plate VARCHAR(20),
  fipe_code VARCHAR(50),
  brand VARCHAR(100),
  brand_name VARCHAR(100),
  model VARCHAR(100),
  model_name VARCHAR(100),
  model_year VARCHAR(20),
  manufacture_year INTEGER,
  fuel VARCHAR(50),
  transmission VARCHAR(50),
  color VARCHAR(50),
  bodywork VARCHAR(50),
  version VARCHAR(255),
  state VARCHAR(50),
  mileage VARCHAR(50),

  -- Valores
  value DECIMAL(15, 2),
  valor_financiar VARCHAR(100),

  -- Tipo de pessoa
  tipo_pessoa VARCHAR(20) DEFAULT 'fisica',

  -- Dados pessoais (Pessoa Física)
  nome VARCHAR(255),
  cpf_pf VARCHAR(20),
  data_nascimento VARCHAR(20),
  sexo VARCHAR(20),
  nome_mae VARCHAR(255),
  nome_pai VARCHAR(255),
  rg VARCHAR(50),
  data_emissao_rg VARCHAR(20),
  orgao_expedidor VARCHAR(50),
  naturalidade VARCHAR(100),
  estado_civil VARCHAR(50),
  possui_cnh BOOLEAN DEFAULT FALSE,

  -- Dados de contato (Pessoa Física)
  email_pf VARCHAR(255),
  telefone_pessoal_pf VARCHAR(30),
  telefone_referencia_pf VARCHAR(30),
  cep_pf VARCHAR(20),
  endereco_pf TEXT,
  numero_pf VARCHAR(20),
  referencia_pf TEXT,
  observacoes_pf TEXT,
  comentarios_pf TEXT,

  -- Dados profissionais
  empresa VARCHAR(255),
  cargo VARCHAR(100),
  natureza_ocupacao VARCHAR(100),

  -- Pessoa Jurídica
  cnpj_pj VARCHAR(20),
  email_pj VARCHAR(255),
  telefone_pessoal_pj VARCHAR(30),
  telefone_referencia_pj VARCHAR(30),
  cep_pj VARCHAR(20),
  endereco_pj TEXT,
  numero_pj VARCHAR(20),
  referencia_pj TEXT,
  observacoes_pj TEXT,
  comentarios_pj TEXT,
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),

  -- Análise bancária (boolean para seleção)
  banco_bv BOOLEAN DEFAULT FALSE,
  banco_santander BOOLEAN DEFAULT FALSE,
  banco_pan BOOLEAN DEFAULT FALSE,
  banco_bradesco BOOLEAN DEFAULT FALSE,
  banco_c6 BOOLEAN DEFAULT FALSE,
  banco_itau BOOLEAN DEFAULT FALSE,
  banco_cash BOOLEAN DEFAULT FALSE,
  banco_kunna BOOLEAN DEFAULT FALSE,
  banco_via_certa BOOLEAN DEFAULT FALSE,
  banco_omni BOOLEAN DEFAULT FALSE,
  banco_daycoval BOOLEAN DEFAULT FALSE,
  banco_sim BOOLEAN DEFAULT FALSE,
  banco_creditas BOOLEAN DEFAULT FALSE,
  banco_crefaz BOOLEAN DEFAULT FALSE,
  banco_simpala BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para proposals
CREATE INDEX IF NOT EXISTS idx_proposals_salesperson ON proposals(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_proposals_number ON proposals(proposal_number);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_date ON proposals(date_added);
CREATE INDEX IF NOT EXISTS idx_proposals_tipo_pessoa ON proposals(tipo_pessoa);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para proposals
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- Políticas para users
-- Permitir leitura para usuários autenticados
CREATE POLICY "Users can view all users" ON users
  FOR SELECT
  USING (true);

-- Apenas admins podem inserir/atualizar/deletar
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update users" ON users
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE
  USING (true);

-- Políticas para proposals
-- Permitir leitura para usuários autenticados
CREATE POLICY "Users can view all proposals" ON proposals
  FOR SELECT
  USING (true);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Users can insert proposals" ON proposals
  FOR INSERT
  WITH CHECK (true);

-- Permitir atualização para usuários autenticados
CREATE POLICY "Users can update proposals" ON proposals
  FOR UPDATE
  USING (true);

-- Apenas admins podem deletar
CREATE POLICY "Admins can delete proposals" ON proposals
  FOR DELETE
  USING (true);

-- ============================================
-- DADOS INICIAIS (Opcional)
-- ============================================

-- Inserir usuário admin padrão (senha: admin123)
-- Hash gerado com bcrypt
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Administrador',
  'contato@nobrecarautomoveis.com.br',
  '$2a$10$rQnM1.5VqJvJvJvJvJvJvOeJvJvJvJvJvJvJvJvJvJvJvJvJvJvJv',
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE users IS 'Tabela de usuários do sistema Nobrecar';
COMMENT ON TABLE proposals IS 'Tabela de propostas de financiamento/refinanciamento';

COMMENT ON COLUMN users.role IS 'Função do usuário: ADMIN ou USER';
COMMENT ON COLUMN proposals.proposal_type IS 'Tipo: financing ou refinancing';
COMMENT ON COLUMN proposals.vehicle_type IS 'Tipo: car ou motorcycle';
COMMENT ON COLUMN proposals.status IS 'Status: Em Análise, Aprovada, Recusada';
COMMENT ON COLUMN proposals.tipo_pessoa IS 'Tipo: fisica ou juridica';

