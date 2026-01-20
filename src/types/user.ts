export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: number;
  lastLogin?: number;
  createdBy?: string; // UID of admin who created this user
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  canEdit: () => boolean;
  canView: () => boolean;
}
