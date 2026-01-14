import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types/user';

const USERS_COLLECTION = 'users';

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      uid: doc.id
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
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:34',message:'createUser called',data:{email,role,displayName,createdBy},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    // Store current admin user before creating new user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:45',message:'No admin user signed in',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw new Error('Admin must be signed in to create users');
    }
    
    // Create authentication user (this will sign in as the new user)
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:49',message:'Creating Auth user',data:{email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:51',message:'Auth user created',data:{uid:newUser.uid,email:newUser.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: newUser.uid,
      email: email,
      displayName: displayName,
      role: role,
      createdAt: Date.now(),
      createdBy: createdBy
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:62',message:'Writing Firestore profile',data:{uid:newUser.uid,profile:userProfile},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    await setDoc(doc(db, USERS_COLLECTION, newUser.uid), userProfile);
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:63',message:'Firestore profile written successfully',data:{uid:newUser.uid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Sign out the newly created user so admin can continue working
    // Note: The admin will need to refresh or the auth state will update automatically
    await auth.signOut();
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:67',message:'User creation complete',data:{uid:newUser.uid,email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Return the created profile
    return userProfile;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'userService.ts:71',message:'Error creating user',data:{error:error.message,code:error.code,email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email is already in use');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use at least 6 characters');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    }
    throw new Error(error.message || 'Failed to create user');
  }
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(userRef, { role }, { merge: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new Error('Failed to update user role');
  }
};

export const deleteUser = async (uid: string): Promise<void> => {
  try {
    // Note: This only deletes from Firestore. 
    // Deleting from Firebase Auth requires Admin SDK on backend
    await deleteDoc(doc(db, USERS_COLLECTION, uid));
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
};

export const initializeAdminUser = async (email: string, password: string): Promise<void> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const adminProfile: UserProfile = {
      uid: user.uid,
      email: email,
      displayName: 'Admin',
      role: 'admin',
      createdAt: Date.now()
    };
    
    await setDoc(doc(db, USERS_COLLECTION, user.uid), adminProfile);
  } catch (error: any) {
    console.error('Error initializing admin:', error);
    throw error;
  }
};
