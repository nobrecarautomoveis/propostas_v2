/**
 * Serviço de Propostas
 * CRUD completo para gerenciamento de propostas
 */
import { getSupabaseClient } from '@/lib/supabase';
import type { Proposal, ProposalInsert, ProposalUpdate, ProposalWithUser } from '@/lib/supabase';
import { camelToSnake, snakeToCamel } from '@/lib/supabase';

// Tipo para o resultado da query com join
interface ProposalQueryResult extends Proposal {
  salesperson: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// Tipos para entrada de dados (formato camelCase do frontend)
export interface CreateProposalData {
  proposalType: string;
  vehicleType: string;
  isFinanced?: boolean;
  vehicleCondition: string;
  plate?: string;
  fipeCode: string;
  brand: string;
  brandName: string;
  model: string;
  modelName: string;
  modelYear: string;
  manufactureYear: number;
  fuel: string;
  transmission: string;
  color: string;
  value: number;
  valorFinanciar?: string;
  licensingLocation: string;
  status: string;
  userId: string;
  // Pessoa Física
  cpfPF?: string;
  emailPF?: string;
  telefonePessoalPF?: string;
  telefoneReferenciaPF?: string;
  cepPF?: string;
  enderecoPF?: string;
  numeroPF?: string;
  referenciaPF?: string;
  observacoesPF?: string;
  comentariosPF?: string;
  nome?: string;
  dataNascimento?: string;
  sexo?: string;
  nomeMae?: string;
  nomePai?: string;
  rg?: string;
  dataEmissaoRg?: string;
  orgaoExpedidor?: string;
  naturalidade?: string;
  estadoCivil?: string;
  possuiCnh?: boolean;
  empresa?: string;
  cargo?: string;
  naturezaOcupacao?: string;
  // Pessoa Jurídica
  cnpjPJ?: string;
  emailPJ?: string;
  telefonePessoalPJ?: string;
  telefoneReferenciaPJ?: string;
  cepPJ?: string;
  enderecoPJ?: string;
  numeroPJ?: string;
  referenciaPJ?: string;
  observacoesPJ?: string;
  comentariosPJ?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  tipoPessoa?: string;
}

export interface UpdateProposalData extends Partial<Omit<CreateProposalData, 'userId'>> {
  // Análise Bancária
  bancoBv?: boolean;
  bancoSantander?: boolean;
  bancoPan?: boolean;
  bancoBradesco?: boolean;
  bancoC6?: boolean;
  bancoItau?: boolean;
  bancoCash?: boolean;
  bancoKunna?: boolean;
  bancoViaCerta?: boolean;
  bancoOmni?: boolean;
  bancoDaycoval?: boolean;
  bancoSim?: boolean;
  bancoCreditas?: boolean;
  bancoCrefaz?: boolean;
  bancoSimpala?: boolean;
}

/**
 * Gera o próximo número de proposta
 */
async function generateProposalNumber(): Promise<string> {
  const supabase = getSupabaseClient();
  
  const { count, error } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Erro ao contar propostas:', error);
    return `PROP-${Date.now()}`;
  }

  const nextNumber = (count || 0) + 1;
  return `PROP-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Busca todas as propostas com dados do vendedor
 * Aplica filtro baseado na role do usuário:
 * - ADMIN: vê todas as propostas
 * - USER: vê apenas suas próprias propostas
 */
export async function getProposals(userId?: string): Promise<ProposalWithUser[]> {
  const supabase = getSupabaseClient();
  
  if (!userId) {
    return [];
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    console.error('❌ Usuário não encontrado:', userId);
    return [];
  }

  let query = supabase
    .from('proposals')
    .select(`
      *,
      salesperson:users!salesperson_id (
        id,
        name,
        email
      )
    `);

  if (user.role !== 'ADMIN') {
    query = query.eq('salesperson_id', userId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar propostas:', error);
    return [];
  }

  const proposals = data as ProposalQueryResult[] | null;
  return (proposals || []).map(proposal => {
    const { salesperson, ...rest } = proposal;
    const camelCaseProposal = snakeToCamel(rest as Record<string, unknown>);
    return {
      ...camelCaseProposal,
      createdBy: salesperson ? {
        id: salesperson.id,
        name: salesperson.name,
        email: salesperson.email,
      } : null,
    };
  }) as ProposalWithUser[];
}

/**
 * Busca uma proposta pelo ID
 */
export async function getProposalById(proposalId: string, userId?: string): Promise<ProposalWithUser | null> {
  const supabase = getSupabaseClient();
  
  if (!userId) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      salesperson:users!salesperson_id (
        id,
        name,
        email
      )
    `)
    .eq('id', proposalId)
    .single();

  if (error) {
    console.error('❌ Erro ao buscar proposta:', error);
    return null;
  }

  const proposal = data as ProposalQueryResult | null;
  if (!proposal) return null;

  // Converter snake_case -> camelCase
  const { salesperson, ...rest } = proposal;
  const camelCaseProposal = snakeToCamel(rest as Record<string, unknown>);

  return {
    ...camelCaseProposal,
    createdBy: salesperson ? {
      id: salesperson.id,
      name: salesperson.name,
      email: salesperson.email,
    } : null,
  } as ProposalWithUser;
}

/**
 * Cria uma nova proposta
 */
export async function createProposal(proposalData: CreateProposalData & Record<string, unknown>): Promise<{ proposalId: string; proposalNumber: string }> {
  const supabase = getSupabaseClient();
  
  console.log('📝 Criando nova proposta...');

  const { userId, ...data } = proposalData;

  // Validar userId
  if (!userId) {
    throw new Error('userId é obrigatório');
  }

  // Verificar se usuário existe
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error(`Usuário não encontrado com ID: ${userId}`);
  }

  // Validar campos obrigatórios
  const requiredFields = ['proposalType', 'vehicleType', 'fipeCode', 'brand', 'brandName', 'model', 'modelName', 'modelYear', 'manufactureYear', 'fuel', 'transmission', 'color', 'value', 'licensingLocation', 'status'];
  const missingFields = requiredFields.filter(field => !data[field as keyof typeof data]);

  if (missingFields.length > 0) {
    throw new Error(`Campos obrigatórios faltando: ${missingFields.join(', ')}`);
  }

  // Gerar número da proposta
  const proposalNumber = await generateProposalNumber();

  // Converter para snake_case
  const snakeData = camelToSnake(data as Record<string, unknown>);

  // Inserir proposta
  const insertData = {
    ...snakeData,
    proposal_number: proposalNumber,
    date_added: new Date().toISOString(),
    salesperson_id: userId,
  };

  const { data: newProposal, error } = await (supabase
    .from('proposals') as any)
    .insert(insertData)
    .select('id, proposal_number')
    .single();

  if (error) {
    console.error('❌ Erro ao criar proposta:', error);
    throw new Error('Erro ao criar proposta');
  }

  const result = newProposal as { id: string; proposal_number: string } | null;
  if (!result) {
    throw new Error('Erro ao criar proposta: resultado vazio');
  }

  console.log('✅ Proposta criada:', result.proposal_number);
  return {
    proposalId: result.id,
    proposalNumber: result.proposal_number
  };
}

/**
 * Atualiza uma proposta existente
 */
export async function updateProposal(proposalId: string, updates: UpdateProposalData): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  
  console.log('📝 Atualizando proposta:', proposalId);

  // Verificar se proposta existe
  const { data: existing, error: findError } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .single();

  if (findError || !existing) {
    throw new Error('Proposta não encontrada');
  }

  // Converter para snake_case
  const snakeData = camelToSnake(updates as Record<string, unknown>);

  // Atualizar
  const updateData = {
    ...snakeData,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase
    .from('proposals') as any)
    .update(updateData)
    .eq('id', proposalId);

  if (error) {
    console.error('❌ Erro ao atualizar proposta:', error);
    throw new Error('Erro ao atualizar proposta');
  }

  console.log('✅ Proposta atualizada com sucesso');
  return { success: true };
}

/**
 * Deleta uma proposta
 */
export async function deleteProposal(proposalId: string, userId: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  
  console.log('🗑️ Deletando proposta:', proposalId);

  // Verificar se proposta existe
  const { data: proposal, error: findError } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', proposalId)
    .single();

  if (findError || !proposal) {
    throw new Error('Proposta não encontrada');
  }

  // Verificar se usuário existe
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error('Usuário não encontrado');
  }

  // Deletar
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', proposalId);

  if (error) {
    console.error('❌ Erro ao deletar proposta:', error);
    throw new Error('Erro ao deletar proposta');
  }

  console.log('✅ Proposta deletada com sucesso');
  return { success: true };
}

/**
 * Atualiza apenas os campos de análise bancária
 */
export async function updateBankAnalysis(proposalId: string, userId: string, bankData: Partial<UpdateProposalData>): Promise<{ success: boolean }> {
  // Filtrar apenas campos de banco
  const bankFields = ['bancoBv', 'bancoSantander', 'bancoPan', 'bancoBradesco', 'bancoC6', 'bancoItau', 'bancoCash', 'bancoKunna', 'bancoViaCerta', 'bancoOmni', 'bancoDaycoval', 'bancoSim', 'bancoCreditas', 'bancoCrefaz', 'bancoSimpala'];
  
  const filteredData: Record<string, boolean | undefined> = {};
  for (const field of bankFields) {
    if (field in bankData) {
      filteredData[field] = bankData[field as keyof typeof bankData] as boolean | undefined;
    }
  }

  return updateProposal(proposalId, filteredData);
}

