
import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, AuthContextType, UserRole } from '../types/user';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Supabase Auth Provider
 * Handles real authentication via Supabase Auth + profiles table.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginRequired] = useState<boolean>(true);

  // Fetch user profile from the profiles table
  const fetchProfile = async (uid: string, email: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error) {
        console.warn('Profile fetch error (may not exist yet):', error.message);
        // Profile might not exist yet (trigger delay), return a minimal profile
        return {
          uid,
          email,
          displayName: email.split('@')[0],
          role: 'viewer' as UserRole,
          createdAt: Date.now(),
        };
      }

      return {
        uid: data.id,
        email: data.email,
        displayName: data.display_name || email.split('@')[0],
        role: (data.role || 'viewer') as UserRole,
        createdAt: new Date(data.created_at).getTime(),
        lastLogin: data.last_login ? new Date(data.last_login).getTime() : undefined,
      };
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      return null;
    }
  };

  useEffect(() => {
    // Check existing session
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error.message);
          setAuthError(error.message);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id, session.user.email || '');
          setUser(profile);

          // Update last_login
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', session.user.id);
        }
      } catch (err: any) {
        console.error('Auth init error:', err);
        setAuthError(err.message || 'Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id, session.user.email || '');
          setUser(profile);
          setAuthError(null);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const isAdmin = () => user?.role === 'admin';
  const canEdit = () => user?.role === 'admin' || user?.role === 'editor';
  const canView = () => !!user;

  const setLoginRequired = async (_required: boolean) => {
    // Login is always required with Supabase auth
  };

  const refreshLoginRequired = async () => {
    // No-op with Supabase auth
  };

  const checkHealth = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    authError,
    loginRequired,
    signIn,
    signUp,
    signOut,
    isAdmin,
    canEdit,
    canView,
    setLoginRequired,
    refreshLoginRequired,
    checkHealth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
