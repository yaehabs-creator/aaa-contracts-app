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
  setDoc,
  writeBatch,
  where
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { SavedContract, ContractSection, SectionItem, SectionType } from '../types';
import { ensureContractHasSections } from '../../services/contractMigrationService';

const CONTRACTS_COLLECTION = 'contracts';
const MAX_DOCUMENT_SIZE = 1000000; // 1MB in bytes (with some buffer)

/**
 * Recursively removes undefined values from an object.
 * Firestore doesn't accept undefined values - they must be omitted or set to null.
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

/**
 * Estimate the size of an object in bytes (rough approximation)
 */
function estimateSize(obj: any): number {
  return JSON.stringify(obj).length * 2; // Rough estimate: UTF-16 encoding
}

/**
 * Save contract using subcollections for large contracts
 */
async function saveContractWithSubcollections(contractRef: any, contract: SavedContract): Promise<void> {
  const batch = writeBatch(db);
  
  // Save main contract document (metadata only, no sections/items)
  const contractMetadata = removeUndefinedValues({
    id: contract.id,
    name: contract.name,
    timestamp: Timestamp.fromMillis(contract.timestamp),
    metadata: contract.metadata,
    // Mark that this contract uses subcollections
    _usesSubcollections: true
  });
  
  batch.set(contractRef, contractMetadata);
  
  // Save sections and items as subcollections
  if (contract.sections && contract.sections.length > 0) {
    for (const section of contract.sections) {
      const sectionRef = doc(db, CONTRACTS_COLLECTION, contract.id, 'sections', section.sectionType);
      
      // Save section metadata
      const sectionData = removeUndefinedValues({
        sectionType: section.sectionType,
        title: section.title,
        itemCount: section.items.length
      });
      
      batch.set(sectionRef, sectionData);
      
      // Save items as subcollection
      for (let i = 0; i < section.items.length; i++) {
        const item = section.items[i];
        const itemId = item.orderIndex?.toString() || i.toString();
        const itemRef = doc(db, CONTRACTS_COLLECTION, contract.id, 'sections', section.sectionType, 'items', itemId);
        
        const itemData = removeUndefinedValues({
          ...item,
          orderIndex: item.orderIndex ?? i
        });
        
        batch.set(itemRef, itemData);
      }
    }
  }
  
  // Commit all writes
  await batch.commit();
}

export const saveContractToFirestore = async (contract: SavedContract): Promise<void> => {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:19',message:'saveContractToFirestore entry',data:{contractId:contract.id,contractName:contract.name,dbIsNull:db===null,authIsNull:auth===null,currentUser:auth?.currentUser?.uid||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  try {
    // Check if db is initialized
    if (!db) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:25',message:'db is null',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw new Error('Firebase Firestore is not initialized. Please check your Firebase configuration.');
    }

    // Check authentication status
    const currentUser = auth?.currentUser;
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:32',message:'auth check before save',data:{isAuthenticated:!!currentUser,userId:currentUser?.uid||null,email:currentUser?.email||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

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
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:55',message:'before setDoc call',data:{contractId:migratedContract.id,hasSections:!!migratedContract.sections,sectionsCount:migratedContract.sections?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const contractRef = doc(db, CONTRACTS_COLLECTION, migratedContract.id);
    
    // Prepare contract data for Firestore (remove undefined values and convert timestamp)
    const contractData = removeUndefinedValues({
      ...migratedContract,
      timestamp: Timestamp.fromMillis(migratedContract.timestamp)
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:85',message:'contractData prepared',data:{contractId:migratedContract.id,hasClauses:!!contractData.clauses,hasSections:!!contractData.sections,keys:Object.keys(contractData),estimatedSize:estimateSize(contractData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    
    // Check if contract is too large (>1MB)
    const estimatedSize = estimateSize(contractData);
    
    if (estimatedSize > MAX_DOCUMENT_SIZE) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:150',message:'contract too large, using subcollections',data:{contractId:migratedContract.id,estimatedSize},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'G'})}).catch(()=>{});
      // #endregion
      
      // Use subcollections for large contracts
      await saveContractWithSubcollections(contractRef, migratedContract);
    } else {
      // Save as single document for smaller contracts
      await setDoc(contractRef, contractData, { merge: false });
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:160',message:'setDoc success',data:{contractId:migratedContract.id,usedSubcollections:estimatedSize>MAX_DOCUMENT_SIZE},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    console.log('Contract saved successfully to Firestore');
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:71',message:'setDoc error caught',data:{errorCode:error?.code||null,errorMessage:error?.message||String(error),errorName:error?.name||null,stack:error?.stack?.substring(0,500)||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    console.error('Error saving contract:', error);
    
    // Extract Firebase error details
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || String(error);
    
    // Provide more specific error messages based on error code
    let userMessage = 'Failed to save contract to server';
    if (errorCode === 'permission-denied') {
      userMessage = 'Permission denied. Please ensure you are logged in and have permission to save contracts.';
    } else if (errorCode === 'unavailable') {
      userMessage = 'Firestore service is temporarily unavailable. Please try again later.';
    } else if (errorCode === 'unauthenticated') {
      userMessage = 'You are not authenticated. Please log in and try again.';
    } else if (errorCode === 'failed-precondition') {
      userMessage = 'Operation failed due to a precondition. Please refresh and try again.';
    } else if (errorMessage.includes('Firebase')) {
      userMessage = `Firebase error: ${errorMessage}`;
    } else {
      userMessage = `Failed to save contract: ${errorMessage}`;
    }
    
    throw new Error(userMessage);
  }
};

export const getAllContractsFromFirestore = async (): Promise<SavedContract[]> => {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:144',message:'getAllContractsFromFirestore entry',data:{dbIsNull:db===null},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
  // #endregion
  
  try {
    if (!db) {
      // #region agent log
      fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:149',message:'db is null in getAllContracts',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      return [];
    }
    
    const q = query(
      collection(db, CONTRACTS_COLLECTION),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:160',message:'querySnapshot received',data:{docCount:querySnapshot.docs.length,docIds:querySnapshot.docs.map(d=>d.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    // Load contracts (we'll load full data for each contract that uses subcollections)
    const contracts = await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // If contract uses subcollections, load full data
        if (data._usesSubcollections) {
          return await loadContractFromSubcollections(doc.id, data);
        }
        
        // Legacy format: single document
        const contract = {
          ...data,
          id: doc.id,
          timestamp: data.timestamp?.toMillis() || Date.now()
        } as SavedContract;
        
        // Auto-migrate on load
        return ensureContractHasSections(contract);
      })
    );
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:175',message:'contracts processed',data:{contractCount:contracts.length,contractIds:contracts.map(c=>c.id),contractNames:contracts.map(c=>c.name)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    return contracts;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/af3752a4-3911-4caa-a71b-f1e58332ade5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'firestoreService.ts:180',message:'getAllContracts error',data:{errorCode:error?.code||null,errorMessage:error?.message||String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    console.error('Error fetching contracts:', error);
    // If permission denied, return empty array (user not authenticated yet)
    if (error.code === 'permission-denied') {
      return [];
    }
    throw new Error('Failed to fetch contracts from server');
  }
};

/**
 * Load contract from subcollections
 */
async function loadContractFromSubcollections(contractId: string, contractMetadata: any): Promise<SavedContract> {
  const sections: ContractSection[] = [];
  
  // Load all sections
  const sectionsSnapshot = await getDocs(
    collection(db, CONTRACTS_COLLECTION, contractId, 'sections')
  );
  
  for (const sectionDoc of sectionsSnapshot.docs) {
    const sectionData = sectionDoc.data();
    const sectionType = sectionData.sectionType as SectionType;
    
    // Load items for this section
    const itemsSnapshot = await getDocs(
      collection(db, CONTRACTS_COLLECTION, contractId, 'sections', sectionType, 'items')
    );
    
    const items: SectionItem[] = itemsSnapshot.docs
      .map(itemDoc => removeUndefinedValues(itemDoc.data()) as SectionItem)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    
    sections.push({
      sectionType,
      title: sectionData.title,
      items
    });
  }
  
  // Ensure all 4 sections exist
  const contract: SavedContract = {
    ...contractMetadata,
    id: contractId,
    timestamp: contractMetadata.timestamp?.toMillis() || Date.now(),
    sections
  };
  
  return ensureContractHasSections(contract);
}

export const getContractFromFirestore = async (id: string): Promise<SavedContract | null> => {
  try {
    const docRef = doc(db, CONTRACTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Check if contract uses subcollections
      if (data._usesSubcollections) {
        // Load from subcollections
        return await loadContractFromSubcollections(id, data);
      }
      
      // Legacy format: single document
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
    // Check if contract uses subcollections
    const contractRef = doc(db, CONTRACTS_COLLECTION, id);
    const contractSnap = await getDoc(contractRef);
    
    if (contractSnap.exists() && contractSnap.data()._usesSubcollections) {
      // Delete sections and items subcollections
      const sectionsSnapshot = await getDocs(
        collection(db, CONTRACTS_COLLECTION, id, 'sections')
      );
      
      const batch = writeBatch(db);
      
      for (const sectionDoc of sectionsSnapshot.docs) {
        const sectionType = sectionDoc.data().sectionType;
        
        // Delete items in this section
        const itemsSnapshot = await getDocs(
          collection(db, CONTRACTS_COLLECTION, id, 'sections', sectionType, 'items')
        );
        
        itemsSnapshot.docs.forEach(itemDoc => {
          batch.delete(itemDoc.ref);
        });
        
        // Delete section
        batch.delete(sectionDoc.ref);
      }
      
      // Delete main contract document
      batch.delete(contractRef);
      
      await batch.commit();
    } else {
      // Legacy format: just delete the document
      await deleteDoc(contractRef);
    }
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
