/**
 * Serviços - Exportações centralizadas
 */

// Auth Service
export {
  login,
  logout,
  saveSession,
  getSession,
  getCurrentUser,
  isCurrentUserAdmin,
  hashPassword,
  resetUserPassword,
  type LoginCredentials,
  type LoginResult,
  type AuthSession,
} from './auth.service';

// Users Service
export {
  getUserById,
  getUserByEmail,
  getAllUsers,
  getUsersForAdmin,
  createUser,
  updateUser,
  deleteUser,
  getAllAdmins,
  type CreateUserData,
  type UpdateUserData,
} from './users.service';

// Proposals Service
export {
  getProposals,
  getProposalById,
  createProposal,
  updateProposal,
  deleteProposal,
  updateBankAnalysis,
  type CreateProposalData,
  type UpdateProposalData,
} from './proposals.service';

