import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/config';
import { UserProfile, AuthContextType } from '../types/user';
import { getLoginRequired, setLoginRequired as setLoginRequiredApi } from '@/services/supabaseService';
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
  const [authLoading, setAuthLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginRequired, setLoginRequiredState] = useState<boolean>(true);

  // Combined loading state - wait for both auth and settings
  const loading = authLoading || settingsLoading;

  // Load login required setting on mount
  useEffect(() => {
    const loadLoginRequiredSetting = async () => {
      try {
        // Add timeout to prevent hanging if Supabase query stalls
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn('Login required setting fetch timed out, defaulting to true');
            resolve(true);
          }, 15000);
        });
        const required = await Promise.race([getLoginRequired(), timeoutPromise]);
        setLoginRequiredState(required);
        console.log('Login required setting:', required);
      } catch (error) {
        console.error('Error loading login required setting:', error);
        setLoginRequiredState(true);
      } finally {
        setSettingsLoading(false);
      }
    };
    loadLoginRequiredSetting();
  }, []);

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      const supabaseError = typeof window !== 'undefined' ? (window as any).__SUPABASE_CONFIG_ERROR__ : null;
      const errorMsg = supabaseError?.message || 'Supabase is not configured. Please check your environment variables.';
      console.warn('Supabase not configured. Showing login page but authentication will not work.');
      console.error('Supabase Configuration Error:', errorMsg);
      setAuthLoading(false);
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
          setAuthLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setAuthError('Failed to initialize authentication.');
        setAuthLoading(false);
      }
    };

    // Load user profile from Supabase
    const loadUserProfile = async (supabaseUser: User) => {
      console.log('Loading profile for user:', supabaseUser.id);
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

          console.log('User profile loaded successfully:', profile.displayName);
          setUser(profile);

          // Update last login (non-blocking)
          supabase
            .from('users')
            .update({ last_login: Date.now() })
            .eq('uid', supabaseUser.id)
            .then(({ error }) => {
              if (error) console.warn('Failed to update last login:', error);
            });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        sessionStorage.setItem('loginError', 'Error loading your profile. Please try again or contact your administrator.');
        setUser(null);
      } finally {
        console.log('Auth initialization complete (profile)');
        setAuthLoading(false);
        clearTimeout(timeoutId);
      }
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      if (authLoading) {
        console.error('Auth initialization timeout - Supabase may not be configured correctly or query is hanging');
        setAuthError('Authentication timed out. Please refresh the page.');
        setAuthLoading(false);
      }
    }, 30000); // Increased from 12s to 30s to be more resilient to slow connections

    // Get initial session
    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event);
      setAuthError(null);

      if (session?.user) {
        await loadUserProfile(session.user);
      } else {
        console.log('No session found in state change');
        setUser(null);
        setAuthLoading(false);
        clearTimeout(timeoutId);
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
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password');
      }
      if (error.message.includes('Email not confirmed') || error.message.includes('email not confirmed')) {
        throw new Error('Email not confirmed. Please check your inbox and verify your email address.');
      }
      throw new Error(error.message || 'Failed to sign in');
    }

    if (!data.user) {
      throw new Error('Failed to sign in');
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }

    // Create auth user in Supabase
    // Pass display_name in metadata so the database trigger can use it
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          full_name: displayName,
        }
      }
    });

    if (error) {
      // Map Supabase errors to user-friendly messages
      if (error.message.includes('User already registered')) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      if (error.message.includes('Password should be at least')) {
        throw new Error('Password must be at least 6 characters long.');
      }
      if (error.message.includes('Invalid email')) {
        throw new Error('Please enter a valid email address.');
      }
      throw new Error(error.message || 'Failed to create account');
    }

    if (!data.user) {
      throw new Error('Failed to create account');
    }

    // Note: User profile is automatically created by database trigger (handle_new_user)
    // The trigger uses the display_name from user metadata

    // Check if email confirmation is required
    if (data.user.identities && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    // If email confirmation is enabled, user needs to verify
    if (!data.session) {
      throw new Error('SUCCESS_NEEDS_VERIFICATION');
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

  // Function to update login required setting (admin only)
  const setLoginRequired = async (required: boolean) => {
    try {
      await setLoginRequiredApi(required);
      setLoginRequiredState(required);
    } catch (error) {
      console.error('Error updating login required setting:', error);
      throw error;
    }
  };

  // Function to refresh login required setting
  const refreshLoginRequired = async () => {
    try {
      const required = await getLoginRequired();
      setLoginRequiredState(required);
    } catch (error) {
      console.error('Error refreshing login required setting:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    loginRequired,
    signIn,
    signUp,
    signOut,
    isAdmin,
    canEdit,
    canView,
    setLoginRequired,
    refreshLoginRequired
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
