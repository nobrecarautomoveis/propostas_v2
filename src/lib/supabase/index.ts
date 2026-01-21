/**
 * Supabase - Exportações centralizadas
 *
 * NOTA: As funções de servidor (createServerComponentClient, createRouteHandlerClient, createAdminClient)
 * devem ser importadas diretamente de '@/lib/supabase/server' em Server Components.
 */

// Cliente browser
export { createClient, supabase, getSupabaseClient } from './client';

// Tipos
export type {
  Database,
  User,
  UserInsert,
  UserUpdate,
  Proposal,
  ProposalInsert,
  ProposalUpdate,
  ProposalWithUser,
  UserRole,
} from './types';

// Utilitários
export {
  fieldMapping,
  camelToSnake,
  snakeToCamel
} from './types';

