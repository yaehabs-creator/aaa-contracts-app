
import { UserProfile, UserRole } from '../types/user';

/**
 * User Service (Local Mock)
 * User management is now handled through local profiles and auto-login.
 */

export const getAllUsers = async (): Promise<UserProfile[]> => {
  return [{
    uid: 'local-admin',
    email: 'admin@ae.ae',
    displayName: 'Local Admin',
    role: 'admin',
    createdAt: Date.now()
  }];
};

export const createUser = async (
  email: string,
  _password: string,
  role: UserRole,
  displayName: string,
  createdBy: string
): Promise<UserProfile> => {
  return {
    uid: crypto.randomUUID(),
    email,
    displayName,
    role,
    createdAt: Date.now(),
    createdBy
  };
};

export const updateUserRole = async (_uid: string, _role: UserRole): Promise<void> => {};
export const deleteUser = async (_uid: string): Promise<void> => {};
export const initializeAdminUser = async (_email: string, _password: string): Promise<void> => {};
export const getActiveUsersCount = async (_activeWindowMinutes: number = 30): Promise<number> => 1;
export const isUserActive = (_lastLogin: number | undefined, _activeWindowMinutes: number = 30): boolean => true;
