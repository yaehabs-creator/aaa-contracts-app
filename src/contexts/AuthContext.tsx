import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase/config';
import { UserProfile, AuthContextType } from '../types/user';
import { getLoginRequired, setLoginRequired as setLoginRequiredApi } from '../services/supabaseService';
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

  const checkSupabaseHealth = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) return false;

      const startTime = Date.now();
      const response = await fetch(`${url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        }
      });
      const duration = Date.now() - startTime;
      console.log(`🏥 Supabase Health Check: ${response.status} (${duration}ms)`);
      return response.ok || response.status === 401; // 401 is actually "healthy" because we didn't send full auth
    } catch (err) {
      console.error('🏥 Supabase Health Check Failed:', err);
      return false;
    }
  };

  // Load login required setting on mount
  useEffect(() => {
    const loadLoginRequiredSetting = async () => {
      try {
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn('⚠️ Login required setting fetch timed out after 5s, defaulting to true');
            resolve(true);
          }, 5000);
        });
        const required = await Promise.race([getLoginRequired(), timeoutPromise]);
        setLoginRequiredState(required);
        console.log('✅ Login required setting loaded:', required);
      } catch (error) {
        console.error('❌ Error loading login required setting:', error);
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

    // Load user profile from Supabase
    let isProfileLoading = false;
    const loadUserProfile = async (supabaseUser: User) => {
      if (isProfileLoading) return;
      isProfileLoading = true;

      console.log('🔄 loadUserProfile: Loading profile for:', supabaseUser.id);
      try {
        const isSlow = (navigator as any).connection?.effectiveType === '3g' ||
          (navigator as any).connection?.effectiveType === '2g';
        const qTimeoutMs = isSlow ? 45000 : 30000;

        const queryPromise = supabase
          .from('users')
          .select('*')
          .eq('uid', supabaseUser.id)
          .single();

        const queryTimeout = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error(`Profile load timed out (${qTimeoutMs / 1000}s). The network is too slow.`)), qTimeoutMs)
        );

        const { data: userData, error } = await Promise.race([queryPromise, queryTimeout]);

        if (error) {
          if (error.code === 'PGRST116') {
            console.error('User profile not found in Supabase for:', supabaseUser.id, supabaseUser.email);
            sessionStorage.setItem('loginError', 'Your account exists but your profile is missing. Please contact your administrator.');
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

          console.log('✅ loadUserProfile: Profile loaded:', profile.displayName);
          setUser(profile);

          supabase
            .from('users')
            .update({ last_login: Date.now() })
            .eq('uid', supabaseUser.id)
            .then(({ error }) => {
              if (error) console.warn('Failed to update last login:', error);
            });
        }
      } catch (error: any) {
        console.error('❌ Error fetching user profile:', error);
        setAuthError(`Profile load failed: ${error.message || 'Unknown error'}`);
        setUser(null);
      } finally {
        isProfileLoading = false;
        setAuthLoading(false);
        clearTimeout(timeoutId);
      }
    };

    // Get initial session
    const getInitialSession = async () => {
      console.log('🔄 getInitialSession: Starting...');
      try {
        const isHealthy = await checkSupabaseHealth();
        if (!isHealthy) {
          throw new Error('Supabase vault is unreachable. Your firewall or network might be blocking "supabase.co" domains.');
        }

        try {
          localStorage.setItem('supabase_test', 'test');
          localStorage.removeItem('supabase_test');
        } catch (e) {
          throw new Error('Local storage is blocked. Please enable cookies/site-data.');
        }

        const isSlowConnection = (navigator as any).connection?.effectiveType === '3g' ||
          (navigator as any).connection?.effectiveType === '2g';

        const timeoutMs = isSlowConnection ? 45000 : 30000;

        const sessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error(`Connection to secure vault timed out after ${timeoutMs / 1000}s. Your connection (${(navigator as any).connection?.effectiveType || 'unknown'}) is too slow or being blocked.`)), timeoutMs)
        );

        console.log(`🔄 getInitialSession: Fetching session (Timeout: ${timeoutMs}ms)...`);
        const { data: { session }, error } = await Promise.race([sessionPromise, sessionTimeout]);

        if (error) throw error;

        if (session?.user) {
          console.log('🔄 getInitialSession: Session found, loading profile...');
          await loadUserProfile(session.user);
        } else {
          console.log('🔄 getInitialSession: No session found.');
          setAuthLoading(false);
          clearTimeout(timeoutId);
        }
      } catch (error: any) {
        console.error('❌ Error getting initial session:', error);
        let errorMessage = error.message || 'Unknown error';
        if (errorMessage.includes('signal is aborted')) {
          errorMessage = 'The connection was interrupted by your browser. This usually happens on slow 3G/4G networks. Please try refreshing or switching to a faster connection.';
        }
        setAuthError(`Authentication issue: ${errorMessage}`);
        setAuthLoading(false);
        clearTimeout(timeoutId);
      }
    };

    timeoutId = setTimeout(() => {
      setAuthLoading(currentLoading => {
        if (currentLoading) {
          console.error('🚨 Auth initialization timeout - Supabase query is hanging');
          setAuthError('Authentication timed out. Please refresh the page or check your connection.');
          return false;
        }
        return false;
      });
    }, 60000);

    getInitialSession();

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
    if (!supabase) throw new Error('Supabase is not configured.');
    console.log('🔐 Attempting sign in for:', email);

    const signInPromise = supabase.auth.signInWithPassword({ email, password });
    const timeoutPromise = new Promise<any>((_, reject) => {
      setTimeout(() => reject(new Error('Sign-in request timed out. Please check your connection.')), 30000);
    });

    const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

    if (error) {
      console.error('❌ Sign-in error:', error);
      if (error.message.includes('Invalid login credentials')) throw new Error('Invalid email or password');
      if (error.message.includes('Email not confirmed')) throw new Error('Email not confirmed. Please check your inbox.');
      throw new Error(error.message || 'Failed to sign in');
    }

    if (!data.user) throw new Error('Failed to sign in');
    console.log('✅ Sign-in successful for user:', data.user.id);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, full_name: displayName }
      }
    });

    if (error) {
      if (error.message.includes('User already registered')) throw new Error('An account with this email already exists.');
      if (error.message.includes('Password should be at least')) throw new Error('Password must be at least 6 characters long.');
      throw new Error(error.message || 'Failed to create account');
    }

    if (!data.user) throw new Error('Failed to create account');
    if (!data.session) throw new Error('SUCCESS_NEEDS_VERIFICATION');
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    await supabase.auth.signOut();
  };

  const isAdmin = () => user?.role === 'admin';
  const canEdit = () => user?.role === 'admin' || user?.role === 'editor';
  const canView = () => user?.role === 'admin' || user?.role === 'editor' || user?.role === 'viewer';

  const setLoginRequired = async (required: boolean) => {
    try {
      await setLoginRequiredApi(required);
      setLoginRequiredState(required);
    } catch (error) {
      console.error('Error updating login required setting:', error);
      throw error;
    }
  };

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
    checkHealth: checkSupabaseHealth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
