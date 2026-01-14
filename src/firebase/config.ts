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

if (missingVars.length > 0) {
  const errorMsg = `Missing Firebase environment variables: ${missingVars.join(', ')}\n\nPlease configure Firebase in your environment variables.\nSee DEPLOYMENT_GUIDE.md for instructions.`;
  console.error(errorMsg);
  // Don't throw - allow app to load but show error
  if (typeof window !== 'undefined') {
    console.warn('Firebase not configured. Authentication will not work.');
  }
} else {
  // Initialize Firebase
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    // Don't throw - allow app to load but show error
  }
}

// Export Firebase services (may be null if not configured)
export { auth, db };

export default app;
