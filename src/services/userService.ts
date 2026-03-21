import { UserProfile, UserRole } from '../types/user';
import { supabase } from '@/lib/supabase';

/**
 * User Service (Supabase)
 * Handles user profile management from the 'profiles' table.
 */

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return (data || []).map(row => ({
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role as UserRole,
    createdAt: new Date(row.created_at).getTime(),
    lastLogin: row.last_login ? new Date(row.last_login).getTime() : undefined,
  }));
};

export const createUser = async (
  email: string,
  _password: string,
  role: UserRole,
  displayName: string,
  createdBy: string
): Promise<any> => {
  // Direct user creation requires service role key or admin auth
  // For standard users, we use the Auth signup flow.
  // This function is kept for compatibility but should ideally be 
  // redirected to a proper admin invitation flow.
  throw new Error('User creation should be handled via the Signup flow or Admin Invitation.');
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', uid);

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  // Note: This only deletes from the 'profiles' table.
  // Deleting from auth.users requires admin API.
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', uid);

  if (error) {
    console.error('Error deleting user profile:', error);
    throw error;
  }
};

export const getActiveUsersCount = async (activeWindowMinutes: number = 30): Promise<number> => {
  const minutesAgo = new Date(Date.now() - activeWindowMinutes * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gt('last_login', minutesAgo);

  if (error) {
    console.error('Error counting active users:', error);
    return 0;
  }

  return count || 0;
};

export const isUserActive = (lastLogin: number | undefined, activeWindowMinutes: number = 30): boolean => {
  if (!lastLogin) return false;
  const now = Date.now();
  const diffMinutes = (now - lastLogin) / (1000 * 60);
  return diffMinutes <= activeWindowMinutes;
};
