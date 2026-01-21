# Sistema de Propostas Nobrecar

Sistema de gerenciamento de propostas desenvolvido com Next.js 15 e Supabase.

## 🚀 Tecnologias

- **Frontend:** Next.js 15 + React 18 + TypeScript
- **Backend:** Supabase (PostgreSQL)
- **UI:** Shadcn/UI + Tailwind CSS
- **Autenticação:** Sistema de sessão com bcrypt
- **Validação:** Zod + React Hook Form
- **Integrações:** API FIPE, Gemini AI

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### Variáveis de Ambiente (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_FIPE_TOKEN=your_fipe_token
```

## 🗄️ Configuração do Banco de Dados

Execute as migrations no SQL Editor do Supabase na ordem:

1. `supabase/migrations/001_initial_schema.sql` - Schema inicial
2. `supabase/migrations/002_rls_user_permissions.sql` - Permissões RLS
3. `supabase/migrations/003_add_efetivada_status.sql` - Status Efetivada
4. `supabase/migrations/003_create_proposal_activities.sql` - Tabela de atividades
5. `supabase/migrations/004_add_devolvida_reanalise_status.sql` - Status Devolvida/Reanalise

### Criar Primeiro Usuário Admin

```sql
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Admin',
  'admin@nobrecar.com',
  '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'ADMIN'
);
```

> Use bcrypt para gerar o hash da senha

## 📋 Funcionalidades

### Gestão de Propostas
- ✅ CRUD completo de propostas
- ✅ Filtros por status, ano, mês, usuário e busca
- ✅ KPI Cards com métricas em tempo real
- ✅ Status: Digitando, Em Análise, Aprovada, Recusada, Efetivada, Devolvida, Reanalise
- ✅ Edição inline de status e análise bancária
- ✅ Timeline de atividades

### Análise Bancária
- ✅ 15 bancos configurados
- ✅ Toggle ativo/desativado por banco
- ✅ Edição rápida diretamente na página de detalhes

### Clientes
- ✅ Suporte para Pessoa Física e Jurídica
- ✅ Validação de CPF, CNPJ e RG
- ✅ Busca por nome/razão social

### Veículos
- ✅ Integração com API FIPE
- ✅ Suporte para veículos de leilão e estrangeiros
- ✅ Consulta automática de modelos e valores

### Sistema
- ✅ Autenticação com sessões seguras
- ✅ Controle de acesso por role (ADMIN/USER)
- ✅ USER vê apenas suas propostas
- ✅ ADMIN vê todas + pode gerenciar usuários
- ✅ Tema claro/escuro
- ✅ Interface responsiva

## 🔐 Controle de Acesso

### Role USER
- Visualiza apenas propostas próprias
- Pode criar, editar e excluir suas propostas
- Pode adicionar atividades nas suas propostas
- Não tem acesso à gestão de usuários

### Role ADMIN
- Visualiza todas as propostas do sistema
- Pode filtrar por usuário
- Pode editar e excluir qualquer proposta
- Pode editar e excluir atividades de qualquer proposta
- Acesso completo à gestão de usuários

## 📂 Estrutura do Projeto

```
propostas_v2/
├── src/
│   ├── app/                      # Páginas Next.js App Router
│   │   ├── (app)/               # Layout autenticado
│   │   │   ├── dashboard/       # Dashboard
│   │   │   ├── propostas/       # Gestão de propostas
│   │   │   └── usuarios/        # Gestão de usuários
│   │   └── admin/               # Área administrativa
│   ├── components/              # Componentes React
│   │   ├── auth/               # Login e autenticação
│   │   ├── proposals/          # Componentes de propostas
│   │   ├── users/              # Componentes de usuários
│   │   ├── layout/             # Header, sidebar, nav
│   │   └── ui/                 # Shadcn/UI components
│   ├── hooks/                   # Hooks customizados
│   │   ├── use-auth.ts
│   │   ├── use-proposals.ts
│   │   ├── use-activities.ts
│   │   └── use-users.ts
│   ├── services/                # Lógica de negócio
│   │   ├── auth.service.ts
│   │   ├── proposals.service.ts
│   │   ├── activities.service.ts
│   │   └── users.service.ts
│   └── lib/                     # Utilitários
│       ├── supabase/           # Cliente Supabase
│       └── utils.ts            # Funções auxiliares
├── supabase/
│   └── migrations/              # Migrations SQL
├── public/                      # Arquivos estáticos
└── package.json
```

## 🛠️ Scripts Disponíveis

```bash
npm run dev         # Desenvolvimento (porta 9002)
npm run build       # Build de produção
npm run start       # Servidor de produção
npm run typecheck   # Verificação de tipos TypeScript
```

## 🚀 Deploy em Produção

### Build

```bash
npm run build
npm run start
```

### Vercel (Recomendado)

1. Conecte seu repositório no Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Variáveis de Ambiente Obrigatórias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_FIPE_TOKEN`

## 📝 Notas de Desenvolvimento

- Next.js 15 com App Router
- TypeScript strict mode
- ESLint + Prettier (configurar conforme necessário)
- Componentes server/client components otimizados
- React Query para cache e mutations
- Supabase Row Level Security (RLS) configurado

## 📄 Licença

Uso interno - Nobrecar Automóveis © 2026
