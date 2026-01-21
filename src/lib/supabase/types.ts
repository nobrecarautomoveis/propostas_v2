/**
 * Tipos do banco de dados Supabase
 * Gerados manualmente baseados no schema do Convex
 */

export type UserRole = 'ADMIN' | 'USER';

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'in_analysis';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password_hash: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password_hash: string;
          role: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password_hash?: string;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      proposals: {
        Row: {
          id: string;
          proposal_number: string;
          date_added: string;
          salesperson_id: string;
          
          // Tipo de proposta e veículo
          proposal_type: string;
          vehicle_type: string;
          is_financed: boolean;
          vehicle_condition: string;
          
          // Informações do veículo
          plate: string | null;
          fipe_code: string | null;
          brand: string;
          brand_name: string;
          model: string;
          model_name: string;
          model_year: string;
          manufacture_year: number;
          fuel: string;
          transmission: string;
          color: string;
          
          // Financeiro
          value: number;
          valor_financiar: string | null;
          licensing_location: string;
          status: string;
          
          // Pessoa Física
          cpf_pf: string | null;
          email_pf: string | null;
          telefone_pessoal_pf: string | null;
          telefone_referencia_pf: string | null;
          cep_pf: string | null;
          endereco_pf: string | null;
          numero_pf: string | null;
          referencia_pf: string | null;
          observacoes_pf: string | null;
          comentarios_pf: string | null;
          nome: string | null;
          data_nascimento: string | null;
          sexo: string | null;
          nome_mae: string | null;
          nome_pai: string | null;
          rg: string | null;
          data_emissao_rg: string | null;
          orgao_expedidor: string | null;
          naturalidade: string | null;
          estado_civil: string | null;
          possui_cnh: boolean | null;
          empresa: string | null;
          cargo: string | null;
          natureza_ocupacao: string | null;
          
          // Pessoa Jurídica
          cnpj_pj: string | null;
          email_pj: string | null;
          telefone_pessoal_pj: string | null;
          telefone_referencia_pj: string | null;
          cep_pj: string | null;
          endereco_pj: string | null;
          numero_pj: string | null;
          referencia_pj: string | null;
          observacoes_pj: string | null;
          comentarios_pj: string | null;
          razao_social: string | null;
          nome_fantasia: string | null;
          tipo_pessoa: string | null;
          
          // Análise Bancária
          banco_bv: boolean | null;
          banco_santander: boolean | null;
          banco_pan: boolean | null;
          banco_bradesco: boolean | null;
          banco_c6: boolean | null;
          banco_itau: boolean | null;
          banco_cash: boolean | null;
          banco_kunna: boolean | null;
          banco_via_certa: boolean | null;
          banco_omni: boolean | null;
          banco_daycoval: boolean | null;
          banco_sim: boolean | null;
          banco_creditas: boolean | null;
          banco_crefaz: boolean | null;
          banco_simpala: boolean | null;
          
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['proposals']['Row'], 'id' | 'created_at' | 'updated_at' | 'proposal_number'> & {
          id?: string;
          proposal_number?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['proposals']['Row']>;
      };
      proposal_activities: {
        Row: {
          id: string;
          proposal_id: string;
          user_id: string | null;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          user_id?: string | null;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          proposal_id?: string;
          user_id?: string | null;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
    };
  };
}

// Tipos auxiliares para uso nos componentes
export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Proposal = Database['public']['Tables']['proposals']['Row'];
export type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];
export type ProposalUpdate = Database['public']['Tables']['proposals']['Update'];

export type Activity = Database['public']['Tables']['proposal_activities']['Row'];
export type ActivityInsert = Database['public']['Tables']['proposal_activities']['Insert'];
export type ActivityUpdate = Database['public']['Tables']['proposal_activities']['Update'];

// Activity com informações do usuário
export interface ActivityWithUser extends Activity {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// Tipo para proposta em camelCase (após conversão do banco)
export interface ProposalCamelCase {
  id: string;
  proposalNumber: string;
  dateAdded: string;
  salespersonId: string;

  // Tipo de proposta e veículo
  proposalType: string;
  vehicleType: string;
  isFinanced: boolean;
  veiculoLeilao: boolean | null;
  estrangeiro: boolean | null;
  possuiCnh: boolean | null;
  vehicleCondition: string;

  // Informações do veículo
  plate: string | null;
  fipeCode: string | null;
  brand: string;
  brandName: string | null;
  model: string;
  modelName: string | null;
  modelYear: string | null;
  manufactureYear: number | null;
  fuel: string | null;
  transmission: string | null;
  color: string | null;

  // Valores
  value: number | null;
  valorFinanciar: string | null;
  licensingLocation: string | null;
  status: string;

  // Tipo de pessoa
  tipoPessoa: string | null;

  // Pessoa Física - dados pessoais
  nome: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  rg: string | null;
  dataEmissaoRg: string | null;
  orgaoExpedidor: string | null;
  naturalidade: string | null;
  estadoCivil: string | null;

  // Pessoa Física - contato
  cpfPF: string | null;
  emailPF: string | null;
  telefonePessoalPF: string | null;
  telefoneReferenciaPF: string | null;
  cepPF: string | null;
  enderecoPF: string | null;
  numeroPF: string | null;
  referenciaPF: string | null;
  observacoesPF: string | null;
  comentariosPF: string | null;

  // Pessoa Física - profissional
  empresa: string | null;
  cargo: string | null;
  naturezaOcupacao: string | null;

  // Pessoa Jurídica
  razaoSocial: string | null;
  nomeFantasia: string | null;
  cnpjPJ: string | null;
  emailPJ: string | null;
  telefonePessoalPJ: string | null;
  telefoneReferenciaPJ: string | null;
  cepPJ: string | null;
  enderecoPJ: string | null;
  numeroPJ: string | null;
  referenciaPJ: string | null;
  observacoesPJ: string | null;
  comentariosPJ: string | null;

  // Bancos
  bancoBv: boolean | null;
  bancoSantander: boolean | null;
  bancoPan: boolean | null;
  bancoBradesco: boolean | null;
  bancoC6: boolean | null;
  bancoItau: boolean | null;
  bancoCash: boolean | null;
  bancoKunna: boolean | null;
  bancoViaCerta: boolean | null;
  bancoOmni: boolean | null;
  bancoDaycoval: boolean | null;
  bancoSim: boolean | null;
  bancoCreditas: boolean | null;
  bancoCrefaz: boolean | null;
  bancoSimpala: boolean | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Tipo para proposta com dados do vendedor (em camelCase)
export type ProposalWithUser = ProposalCamelCase & {
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

// Mapeamento de campos camelCase para snake_case
export const fieldMapping = {
  // Users
  passwordHash: 'password_hash',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  
  // Proposals - básicos
  proposalNumber: 'proposal_number',
  dateAdded: 'date_added',
  salespersonId: 'salesperson_id',
  proposalType: 'proposal_type',
  vehicleType: 'vehicle_type',
  isFinanced: 'is_financed',
  veiculoLeilao: 'veiculo_leilao',
  estrangeiro: 'estrangeiro',
  possuiCnh: 'possui_cnh',
  vehicleCondition: 'vehicle_condition',
  
  // Veículo
  fipeCode: 'fipe_code',
  brandName: 'brand_name',
  modelName: 'model_name',
  modelYear: 'model_year',
  manufactureYear: 'manufacture_year',
  
  // Financeiro
  valorFinanciar: 'valor_financiar',
  licensingLocation: 'licensing_location',
  
  // Pessoa Física
  cpfPF: 'cpf_pf',
  emailPF: 'email_pf',
  telefonePessoalPF: 'telefone_pessoal_pf',
  telefoneReferenciaPF: 'telefone_referencia_pf',
  cepPF: 'cep_pf',
  enderecoPF: 'endereco_pf',
  numeroPF: 'numero_pf',
  referenciaPF: 'referencia_pf',
  observacoesPF: 'observacoes_pf',
  comentariosPF: 'comentarios_pf',
  dataNascimento: 'data_nascimento',
  nomeMae: 'nome_mae',
  nomePai: 'nome_pai',
  dataEmissaoRg: 'data_emissao_rg',
  orgaoExpedidor: 'orgao_expedidor',
  estadoCivil: 'estado_civil',
  naturezaOcupacao: 'natureza_ocupacao',
  
  // Pessoa Jurídica
  cnpjPJ: 'cnpj_pj',
  emailPJ: 'email_pj',
  telefonePessoalPJ: 'telefone_pessoal_pj',
  telefoneReferenciaPJ: 'telefone_referencia_pj',
  cepPJ: 'cep_pj',
  enderecoPJ: 'endereco_pj',
  numeroPJ: 'numero_pj',
  referenciaPJ: 'referencia_pj',
  observacoesPJ: 'observacoes_pj',
  comentariosPJ: 'comentarios_pj',
  razaoSocial: 'razao_social',
  nomeFantasia: 'nome_fantasia',
  tipoPessoa: 'tipo_pessoa',
  
  // Bancos
  bancoBv: 'banco_bv',
  bancoSantander: 'banco_santander',
  bancoPan: 'banco_pan',
  bancoBradesco: 'banco_bradesco',
  bancoC6: 'banco_c6',
  bancoItau: 'banco_itau',
  bancoCash: 'banco_cash',
  bancoKunna: 'banco_kunna',
  bancoViaCerta: 'banco_via_certa',
  bancoOmni: 'banco_omni',
  bancoDaycoval: 'banco_daycoval',
  bancoSim: 'banco_sim',
  bancoCreditas: 'banco_creditas',
  bancoCrefaz: 'banco_crefaz',
  bancoSimpala: 'banco_simpala',
} as const;

// Funções auxiliares para conversão
export function camelToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = (fieldMapping as Record<string, string>)[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

export function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const reverseMapping = Object.fromEntries(
    Object.entries(fieldMapping).map(([k, v]) => [v, k])
  );
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = reverseMapping[key] || key;
    result[camelKey] = value;
  }
  return result;
}

