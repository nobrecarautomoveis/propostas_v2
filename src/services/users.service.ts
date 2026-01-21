/**
 * Serviço de Usuários
 * CRUD completo para gerenciamento de usuários
 */
import { getSupabaseClient } from '@/lib/supabase';
import type { User, UserInsert, UserUpdate, UserRole } from '@/lib/supabase';
import { hashPassword } from './auth.service';

// Tipos
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  password?: string;
}

/**
 * Busca um usuário pelo ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    return null;
  }

  return data;
}

/**
 * Busca um usuário pelo email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found error
      console.error('❌ Erro ao buscar usuário por email:', error);
    }
    return null;
  }

  return data;
}

/**
 * Lista todos os usuários
 * Requer que o solicitante seja autenticado
 */
export async function getAllUsers(requesterId?: string): Promise<User[]> {
  const supabase = getSupabaseClient();
  
  console.log('getAllUsers: Buscando todos os usuários...');

  // Se não há requesterId, retorna array vazio
  if (!requesterId) {
    console.log('getAllUsers: Sem requesterId, retornando array vazio');
    return [];
  }

  // Verificar se requester existe
  const requester = await getUserById(requesterId);
  if (!requester) {
    console.log('getAllUsers: Requester não encontrado');
    return [];
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Erro ao listar usuários:', error);
    return [];
  }

  console.log(`getAllUsers: Encontrados ${data?.length || 0} usuários`);
  return data || [];
}

/**
 * Lista usuários para um admin
 * Verifica se o solicitante é admin
 */
export async function getUsersForAdmin(adminId: string): Promise<User[]> {
  const supabase = getSupabaseClient();
  
  // Verificar se é admin
  const admin = await getUserById(adminId);
  if (!admin || admin.role !== 'ADMIN') {
    throw new Error('Permissão negada. Apenas admins podem listar usuários.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Erro ao listar usuários:', error);
    throw new Error('Erro ao listar usuários');
  }

  return data || [];
}

/**
 * Cria um novo usuário
 */
export async function createUser(userData: CreateUserData): Promise<User> {
  const supabase = getSupabaseClient();
  
  console.log('👤 Criando novo usuário:', userData.name, userData.email);

  // Validações
  if (!userData.name || !userData.email || !userData.password) {
    throw new Error('Nome, email e senha são obrigatórios');
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userData.email)) {
    throw new Error('Email inválido');
  }

  // Validar senha
  if (userData.password.length < 6) {
    throw new Error('Senha deve ter pelo menos 6 caracteres');
  }

  // Verificar se email já existe
  const existing = await getUserByEmail(userData.email);
  if (existing) {
    throw new Error(`Email ${userData.email} já está registrado`);
  }

  // Hash da senha
  const passwordHash = await hashPassword(userData.password);

  // Inserir usuário
  const insertData: UserInsert = {
    name: userData.name,
    email: userData.email,
    password_hash: passwordHash,
    role: userData.role,
  };

  const { data, error } = await (supabase
    .from('users') as any)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao criar usuário:', error);
    throw new Error('Erro ao criar usuário');
  }

  const user = data as User | null;
  if (!user) {
    throw new Error('Erro ao criar usuário: resultado vazio');
  }

  console.log('✅ Usuário criado com sucesso:', user.id);
  return user;
}

/**
 * Atualiza um usuário existente
 */
export async function updateUser(userId: string, updates: UpdateUserData): Promise<User> {
  const supabase = getSupabaseClient();
  
  console.log('📝 Atualizando usuário:', userId);

  const updateData: UserUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (updates.role) {
    updateData.role = updates.role;
  }

  if (updates.password) {
    updateData.password_hash = await hashPassword(updates.password);
  }

  const { data, error } = await (supabase
    .from('users') as any)
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    throw new Error('Erro ao atualizar usuário');
  }

  const user = data as User | null;
  if (!user) {
    throw new Error('Erro ao atualizar usuário: resultado vazio');
  }

  console.log('✅ Usuário atualizado com sucesso');
  return user;
}

/**
 * Deleta um usuário
 */
export async function deleteUser(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log('🗑️ Deletando usuário:', userId);

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    throw new Error('Erro ao deletar usuário');
  }

  console.log('✅ Usuário deletado com sucesso');
}

/**
 * Lista todos os admins
 */
export async function getAllAdmins(): Promise<User[]> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'ADMIN')
    .order('name');

  if (error) {
    console.error('❌ Erro ao listar admins:', error);
    return [];
  }

  return data || [];
}

