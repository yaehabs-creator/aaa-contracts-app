import { supabase } from '../supabase/config';
import { UserProfile, UserRole } from '../types/user';

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }

    return (data || []).map(row => ({
      uid: row.uid,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      createdAt: row.created_at,
      lastLogin: row.last_login || undefined,
      createdBy: row.created_by || undefined
    } as UserProfile));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
};

export const createUser = async (
  email: string,
  password: string,
  role: UserRole,
  displayName: string,
  createdBy: string
): Promise<UserProfile> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    // Get current user to verify admin is signed in
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      throw new Error('Admin must be signed in to create users');
    }
    
    // Note: Creating users requires Supabase Admin API
    // For now, we'll use signUp which requires email confirmation
    // In production, this should be done via a backend API with service role key
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role,
          display_name: displayName
        }
      }
    });

    if (authError) {
      // Handle Supabase auth errors
      if (authError.message.includes('already registered') || authError.message.includes('already exists') || authError.message.includes('User already registered')) {
        throw new Error('Email is already in use');
      }
      if (authError.message.includes('password') || authError.message.includes('Password')) {
        throw new Error('Password is too weak. Please use at least 6 characters');
      }
      if (authError.message.includes('email') || authError.message.includes('Email')) {
        throw new Error('Invalid email address');
      }
      throw new Error(authError.message || 'Failed to create user');
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    const newUserId = authData.user.id;
    
    // Create user profile in users table
    const userProfile = {
      uid: newUserId,
      email: email,
      display_name: displayName,
      role: role,
      created_at: Date.now(),
      created_by: createdBy
    };
    
    const { error: profileError } = await supabase
      .from('users')
      .insert(userProfile);

    if (profileError) {
      throw new Error(`Failed to create user profile: ${profileError.message}`);
    }
    
    // Return the created profile
    return {
      uid: newUserId,
      email: email,
      displayName: displayName,
      role: role,
      createdAt: Date.now(),
      createdBy: createdBy
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('Failed to create user');
  }
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('uid', uid);

    if (error) {
      console.error('Error updating user role:', error);
      throw new Error('Failed to update user role');
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role');
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    // Delete user profile from users table
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('uid', uid);

    if (profileError) {
      console.error('Error deleting user profile:', profileError);
      throw new Error('Failed to delete user profile');
    }

    // Note: Deleting from Supabase Auth requires admin API
    // This should ideally be done on the backend with service role key
    // For now, we'll just delete the profile
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
};

export const initializeAdminUser = async (email: string, password: string): Promise<void> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    // Create authentication user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'admin',
          display_name: 'Admin'
        }
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create admin user account');
    }

    const userId = authData.user.id;
    
    // Create admin profile in users table
    const adminProfile = {
      uid: userId,
      email: email,
      display_name: 'Admin',
      role: 'admin' as UserRole,
      created_at: Date.now()
    };
    
    const { error: profileError } = await supabase
      .from('users')
      .insert(adminProfile);

    if (profileError) {
      // Note: Deleting auth user requires admin API
      // In production, handle this via backend
      throw new Error(`Failed to create admin profile: ${profileError.message}`);
    }
  } catch (error: any) {
    console.error('Error initializing admin:', error);
    throw error;
  }
};

/**
 * Get count of active users (users who logged in within the last specified minutes)
 * @param activeWindowMinutes - Time window in minutes (default: 30 minutes)
 */
export const getActiveUsersCount = async (activeWindowMinutes: number = 30): Promise<number> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    const now = Date.now();
    const activeThreshold = now - (activeWindowMinutes * 60 * 1000);

    const { data, error } = await supabase
      .from('users')
      .select('last_login')
      .gte('last_login', activeThreshold);

    if (error) {
      console.error('Error counting active users:', error);
      throw new Error('Failed to count active users');
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error counting active users:', error);
    throw new Error('Failed to count active users');
  }
};

/**
 * Check if a user is currently active (logged in within the last specified minutes)
 * @param lastLogin - User's last login timestamp
 * @param activeWindowMinutes - Time window in minutes (default: 30 minutes)
 */
export const isUserActive = (lastLogin: number | undefined, activeWindowMinutes: number = 30): boolean => {
  if (!lastLogin) return false;
  const now = Date.now();
  const activeThreshold = now - (activeWindowMinutes * 60 * 1000);
  return lastLogin >= activeThreshold;
};
