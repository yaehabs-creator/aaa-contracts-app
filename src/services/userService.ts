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
  try {
    // Store current admin user before creating new user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Admin must be signed in to create users');
    }
    
    // Create authentication user (this will sign in as the new user)
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: newUser.uid,
      email: email,
      displayName: displayName,
      role: role,
      createdAt: Date.now(),
      createdBy: createdBy
    };
    
    await setDoc(doc(db, USERS_COLLECTION, newUser.uid), userProfile);
    
    // Sign out the newly created user so admin can continue working
    // Note: The admin will need to refresh or the auth state will update automatically
    await auth.signOut();
    
    // Return the created profile
    return userProfile;
  } catch (error: any) {
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

/**
 * Get count of active users (users who logged in within the last specified minutes)
 * @param activeWindowMinutes - Time window in minutes (default: 30 minutes)
 */
export const getActiveUsersCount = async (activeWindowMinutes: number = 30): Promise<number> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const now = Date.now();
    const activeThreshold = now - (activeWindowMinutes * 60 * 1000);
    
    let activeCount = 0;
    querySnapshot.docs.forEach(doc => {
      const userData = doc.data() as UserProfile;
      if (userData.lastLogin && userData.lastLogin >= activeThreshold) {
        activeCount++;
      }
    });
    
    return activeCount;
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
