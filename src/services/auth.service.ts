/**
 * Serviço de Autenticação
 * Gerencia login, logout e sessão do usuário
 */
import { getSupabaseClient } from '@/lib/supabase';
import type { User } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// Constantes
const USER_ID_KEY = 'userId';
const SESSION_DURATION = 86400; // 24 horas em segundos

// Tipos
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  userId: string;
  user: User;
}

export interface AuthSession {
  userId: string | null;
  isAuthenticated: boolean;
}

/**
 * Realiza o login do usuário
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const supabase = getSupabaseClient();
  
  console.log('🔐 Iniciando login para:', credentials.email);

  // Validar inputs
  if (!credentials.email || !credentials.password) {
    throw new Error('Email e senha são obrigatórios');
  }

  // Buscar usuário pelo email
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', credentials.email)
    .single();

  if (error || !data) {
    console.log('❌ Usuário não encontrado:', credentials.email);
    throw new Error('Usuário não encontrado');
  }

  const user = data as User;
  console.log('✅ Usuário encontrado:', user.id);

  // Verificar senha
  if (!user.password_hash) {
    console.log('❌ Usuário sem senha configurada:', credentials.email);
    throw new Error('Usuário não tem senha configurada');
  }

  // Comparar senha (suporta tanto bcrypt quanto texto plano para compatibilidade)
  let isValidPassword = false;

  // Tenta bcrypt primeiro
  if (user.password_hash.startsWith('$2')) {
    isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
  } else {
    // Fallback para comparação simples (compatibilidade com dados antigos)
    isValidPassword = credentials.password === user.password_hash;
  }

  if (!isValidPassword) {
    console.log('❌ Senha incorreta para:', credentials.email);
    throw new Error('Senha incorreta');
  }

  console.log('✅ Login bem-sucedido para:', credentials.email);

  // Salvar sessão
  saveSession(user.id);

  return {
    userId: user.id,
    user
  };
}

/**
 * Realiza o logout do usuário
 */
export function logout(): void {
  // Remover do localStorage
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_ID_KEY);
  }
  
  // Remover cookie
  if (typeof document !== 'undefined') {
    document.cookie = `${USER_ID_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
  
  console.log('👋 Logout realizado');
}

/**
 * Salva a sessão do usuário
 */
export function saveSession(userId: string): void {
  if (typeof window !== 'undefined') {
    // Salvar no localStorage
    window.localStorage.setItem(USER_ID_KEY, userId);
    
    // Salvar no cookie
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = `${USER_ID_KEY}=${userId}; path=/; max-age=${SESSION_DURATION}; secure=${isSecure}; samesite=strict`;
    document.cookie = cookieValue;
  }
}

/**
 * Obtém a sessão atual do usuário
 */
export function getSession(): AuthSession {
  let userId: string | null = null;

  if (typeof window !== 'undefined') {
    // Tentar localStorage primeiro
    userId = window.localStorage.getItem(USER_ID_KEY);
    
    // Se não encontrar, tentar cookie
    if (!userId && typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === USER_ID_KEY) {
          userId = value;
          // Sincronizar com localStorage
          window.localStorage.setItem(USER_ID_KEY, value);
          break;
        }
      }
    }
  }

  return {
    userId,
    isAuthenticated: !!userId,
  };
}

/**
 * Obtém o usuário atual pelo ID da sessão
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId } = getSession();
  
  if (!userId) {
    return null;
  }

  try {
    const supabase = getSupabaseClient();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      console.error('❌ Usuário da sessão não encontrado:', userId);
      logout(); // Limpar sessão inválida
      return null;
    }

    return user;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário atual:', error);
    return null;
  }
}

/**
 * Verifica se o usuário atual é admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'ADMIN';
}

/**
 * Hash de senha usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Reseta a senha de um usuário (admin only)
 */
export async function resetUserPassword(email: string, newPassword: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  console.log('🔄 Resetando senha para:', email);

  // Buscar usuário
  const { data, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (findError || !data) {
    throw new Error('Usuário não encontrado');
  }

  const user = data as { id: string };

  // Gerar novo hash
  const passwordHash = await hashPassword(newPassword);

  // Atualizar senha
  const { error: updateError } = await (supabase
    .from('users') as any)
    .update({
      password_hash: passwordHash,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Erro ao resetar senha:', updateError);
    throw new Error('Erro ao resetar senha');
  }

  console.log('✅ Senha resetada com sucesso para:', email);
  return true;
}

