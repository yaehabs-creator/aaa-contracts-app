import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, AuthContextType } from '../types/user';

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
    // Check if Firebase is configured
    if (!auth || !db) {
      console.warn('Firebase not configured. Showing login page but authentication will not work.');
      setLoading(false);
      setUser(null);
      setAuthError('Firebase is not configured. Please check your environment variables.');
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let timeoutId: NodeJS.Timeout;

    try {
      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (loading) {
          console.error('Auth initialization timeout - Firebase may not be configured correctly');
          setAuthError('Firebase configuration error. Please check your environment variables.');
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
        clearTimeout(timeoutId);
        setAuthError(null);
        
        if (firebaseUser) {
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:51',message:'Auth state changed - user signed in',data:{uid:firebaseUser.uid,email:firebaseUser.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          try {
            // Fetch user profile from Firestore
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:57',message:'Fetching Firestore profile',data:{uid:firebaseUser.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:58',message:'Firestore profile fetch result',data:{uid:firebaseUser.uid,exists:userDoc.exists(),email:firebaseUser.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              // #region agent log
              fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:60',message:'Profile found - setting user',data:{uid:firebaseUser.uid,role:userData.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
              setUser(userData);
              
              // Update last login
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...userData,
                lastLogin: Date.now()
              }, { merge: true });
            } else {
              // If no profile exists, sign out and show error
              // #region agent log
              fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:69',message:'Profile NOT found - signing out',data:{uid:firebaseUser.uid,email:firebaseUser.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
              console.error('User profile not found in Firestore for:', firebaseUser.uid, firebaseUser.email);
              // Store error message in sessionStorage so login page can show it
              sessionStorage.setItem('loginError', 'Your account exists but your profile is missing. Please contact your administrator to create your user profile.');
              await firebaseSignOut(auth);
              setUser(null);
            }
          } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:76',message:'Error fetching profile',data:{uid:firebaseUser.uid,error:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            console.error('Error fetching user profile:', error);
            sessionStorage.setItem('loginError', 'Error loading your profile. Please try again or contact your administrator.');
            setUser(null);
          }
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:81',message:'No user signed in',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          setUser(null);
        }
        setLoading(false);
      }, (error) => {
        // Handle auth errors
        clearTimeout(timeoutId);
        console.error('Auth state change error:', error);
        setAuthError('Authentication error. Please check your Firebase configuration.');
        setUser(null);
        setLoading(false);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Failed to initialize auth:', error);
      setAuthError('Failed to initialize authentication. Please check your Firebase configuration.');
      setLoading(false);
    }

    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Firebase is not configured. Please check your environment variables.');
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
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
