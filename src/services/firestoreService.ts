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
import { ensureContractHasSections } from '../../services/contractMigrationService';

const CONTRACTS_COLLECTION = 'contracts';

export const saveContractToFirestore = async (contract: SavedContract): Promise<void> => {
  try {
    // Ensure contract has sections (migrate if needed), but preserve existing sections
    let migratedContract: SavedContract;
    
    // If contract already has sections with items, preserve them
    if (contract.sections && contract.sections.length > 0) {
      // Contract has sections - ensure all 4 sections exist, but preserve existing items
      migratedContract = ensureContractHasSections(contract);
    } else {
      // No sections - migrate/create them
      migratedContract = ensureContractHasSections(contract);
    }
    
    // Log what we're saving for debugging
    console.log('Saving contract to Firestore:', {
      id: migratedContract.id,
      name: migratedContract.name,
      hasSections: !!migratedContract.sections,
      sectionsCount: migratedContract.sections?.length || 0,
      agreementItems: migratedContract.sections?.find(s => s.sectionType === 'AGREEMENT')?.items.length || 0,
      loaItems: migratedContract.sections?.find(s => s.sectionType === 'LOA')?.items.length || 0,
      generalItems: migratedContract.sections?.find(s => s.sectionType === 'GENERAL')?.items.length || 0,
      particularItems: migratedContract.sections?.find(s => s.sectionType === 'PARTICULAR')?.items.length || 0
    });
    
    const contractRef = doc(db, CONTRACTS_COLLECTION, migratedContract.id);
    
    // Save the entire contract including sections
    await setDoc(contractRef, {
      ...migratedContract,
      timestamp: Timestamp.fromMillis(migratedContract.timestamp)
    }, { merge: false }); // Use setDoc with merge: false to replace entire document
    
    console.log('Contract saved successfully to Firestore');
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
      const contract = {
        ...data,
        id: doc.id,
        timestamp: data.timestamp?.toMillis() || Date.now()
      } as SavedContract;
      // Auto-migrate on load
      return ensureContractHasSections(contract);
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
      const contract = {
        ...data,
        id: docSnap.id,
        timestamp: data.timestamp?.toMillis() || Date.now()
      } as SavedContract;
      
      // Log what we're loading
      console.log('Loading contract from Firestore:', {
        id: contract.id,
        name: contract.name,
        hasSections: !!contract.sections,
        sectionsCount: contract.sections?.length || 0,
        hasClauses: !!contract.clauses,
        clausesCount: contract.clauses?.length || 0,
        agreementItems: contract.sections?.find(s => s.sectionType === 'AGREEMENT')?.items.length || 0,
        loaItems: contract.sections?.find(s => s.sectionType === 'LOA')?.items.length || 0
      });
      
      // Auto-migrate on load (preserves existing sections)
      const migratedContract = ensureContractHasSections(contract);
      
      // Log after migration
      console.log('After migration:', {
        id: migratedContract.id,
        sectionsCount: migratedContract.sections?.length || 0,
        agreementItems: migratedContract.sections?.find(s => s.sectionType === 'AGREEMENT')?.items.length || 0,
        loaItems: migratedContract.sections?.find(s => s.sectionType === 'LOA')?.items.length || 0
      });
      
      return migratedContract;
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
