import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/config';
import { UserProfile, AuthContextType } from '../types/user';
import type { User, Session } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      const supabaseError = typeof window !== 'undefined' ? (window as any).__SUPABASE_CONFIG_ERROR__ : null;
      const errorMsg = supabaseError?.message || 'Supabase is not configured. Please check your environment variables.';
      console.warn('Supabase not configured. Showing login page but authentication will not work.');
      console.error('Supabase Configuration Error:', errorMsg);
      setLoading(false);
      setUser(null);
      setAuthError(errorMsg);
      return;
    }

    let timeoutId: NodeJS.Timeout;

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setAuthError('Failed to initialize authentication.');
        setLoading(false);
      }
    };

    // Load user profile from Supabase
    const loadUserProfile = async (supabaseUser: User) => {
      try {
        // Fetch user profile from users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('uid', supabaseUser.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile not found
            console.error('User profile not found in Supabase for:', supabaseUser.id, supabaseUser.email);
            sessionStorage.setItem('loginError', 'Your account exists but your profile is missing. Please contact your administrator to create your user profile.');
            await supabase.auth.signOut();
            setUser(null);
            setLoading(false);
            return;
          }
          throw error;
        }

        if (userData) {
          const profile: UserProfile = {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.display_name,
            role: userData.role,
            createdAt: userData.created_at,
            lastLogin: userData.last_login || undefined,
            createdBy: userData.created_by || undefined
          };
          
          setUser(profile);
          
          // Update last login
          await supabase
            .from('users')
            .update({ last_login: Date.now() })
            .eq('uid', supabaseUser.id);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        sessionStorage.setItem('loginError', 'Error loading your profile. Please try again or contact your administrator.');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      if (loading) {
        console.error('Auth initialization timeout - Supabase may not be configured correctly');
        setAuthError('Supabase configuration error. Please check your environment variables.');
        setLoading(false);
      }
    }, 10000);

    // Get initial session
    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeoutId);
      setAuthError(null);
      
      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      if (error.message.includes('Invalid login credentials') || error.message.includes('email not confirmed')) {
        throw new Error('Invalid email or password');
      }
      throw new Error(error.message || 'Failed to sign in');
    }

    if (!data.user) {
      throw new Error('Failed to sign in');
    }
  };

  const signOut = async () => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }
    await supabase.auth.signOut();
  };

  const isAdmin = () => user?.role === 'admin';
  const canEdit = () => user?.role === 'admin' || user?.role === 'editor';
  const canView = () => user?.role === 'admin' || user?.role === 'editor' || user?.role === 'viewer';

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin,
    canEdit,
    canView
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
