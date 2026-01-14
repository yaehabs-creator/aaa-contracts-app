import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp,
  setDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { SavedContract } from '../types';

const CONTRACTS_COLLECTION = 'contracts';

export const saveContractToFirestore = async (contract: SavedContract): Promise<void> => {
  try {
    const contractRef = doc(db, CONTRACTS_COLLECTION, contract.id);
    await setDoc(contractRef, {
      ...contract,
      timestamp: Timestamp.fromMillis(contract.timestamp)
    });
  } catch (error) {
    console.error('Error saving contract:', error);
    throw new Error('Failed to save contract to server');
  }
};

export const getAllContractsFromFirestore = async (): Promise<SavedContract[]> => {
  try {
    const q = query(
      collection(db, CONTRACTS_COLLECTION),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toMillis() || Date.now()
      } as SavedContract;
    });
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    // If permission denied, return empty array (user not authenticated yet)
    if (error.code === 'permission-denied') {
      return [];
    }
    throw new Error('Failed to fetch contracts from server');
  }
};

export const getContractFromFirestore = async (id: string): Promise<SavedContract | null> => {
  try {
    const docRef = doc(db, CONTRACTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        timestamp: data.timestamp?.toMillis() || Date.now()
      } as SavedContract;
    }
    return null;
  } catch (error) {
    console.error('Error fetching contract:', error);
    throw new Error('Failed to fetch contract from server');
  }
};

export const deleteContractFromFirestore = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CONTRACTS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting contract:', error);
    throw new Error('Failed to delete contract from server');
  }
};

// Activity logging (optional but useful for audit trails)
export const logActivity = async (
  action: string,
  contractId: string,
  userId: string,
  details?: any
): Promise<void> => {
  try {
    await addDoc(collection(db, 'activityLogs'), {
      action,
      contractId,
      userId,
      details,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
};
