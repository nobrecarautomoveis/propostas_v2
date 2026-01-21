/**
 * Cliente Supabase para uso no browser (client-side)
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient as BaseSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Tipo do cliente Supabase
export type SupabaseClient = BaseSupabaseClient<Database>;

// Criar cliente singleton para o browser
let browserClient: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Variáveis de ambiente do Supabase não configuradas. ' +
      'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }
  browserClient = createSupabaseClient();
  return browserClient;
}

// Helper para obter o cliente (cria sob demanda)
export function getSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseClient();
  }
  return browserClient;
}

// Exportar cliente para uso direto
export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createSupabaseClient()
  : null;

