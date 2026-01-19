import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
// You'll need to replace these with your actual Firebase project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase configuration
const missingVars: string[] = [];
if (!firebaseConfig.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
if (!firebaseConfig.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!firebaseConfig.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
if (!firebaseConfig.storageBucket) missingVars.push('VITE_FIREBASE_STORAGE_BUCKET');
if (!firebaseConfig.messagingSenderId) missingVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
if (!firebaseConfig.appId) missingVars.push('VITE_FIREBASE_APP_ID');

let app: any = null;
let auth: any = null;
let db: any = null;
let configError: string | null = null;

if (missingVars.length > 0) {
  const errorMsg = `Missing Firebase environment variables: ${missingVars.join(', ')}`;
  configError = errorMsg;
  console.error('❌ Firebase Configuration Error:', errorMsg);
  console.error('📖 Please configure Firebase in your .env.local file.');
  console.error('📚 See DEPLOYMENT_GUIDE.md for setup instructions.');
  
  // Store error in window for error boundary to access
  if (typeof window !== 'undefined') {
    (window as any).__FIREBASE_CONFIG_ERROR__ = {
      message: errorMsg,
      missingVars: missingVars,
      instructions: 'Please check your .env.local file and ensure all VITE_FIREBASE_* variables are set correctly.'
    };
    console.warn('⚠️ Firebase not configured. Authentication will not work.');
  }
} else {
  // Initialize Firebase
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
    console.log('📊 Firebase Project:', firebaseConfig.projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    configError = `Failed to initialize Firebase: ${errorMessage}`;
    console.error('❌ Firebase Initialization Error:', error);
    
    // Store error in window for error boundary to access
    if (typeof window !== 'undefined') {
      (window as any).__FIREBASE_CONFIG_ERROR__ = {
        message: configError,
        error: error,
        instructions: 'Please verify your Firebase configuration values are correct.'
      };
    }
  }
}

// Export Firebase services (may be null if not configured)
export { auth, db, configError };

export default app;
