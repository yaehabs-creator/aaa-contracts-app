
import { SavedContract } from "../types";
import { 
  saveContractToFirestore, 
  getAllContractsFromFirestore, 
  deleteContractFromFirestore 
} from "../src/services/firestoreService";

// Legacy IndexedDB functions - kept for backward compatibility
const DB_NAME = "AAA_Contract_DB";
const STORE_NAME = "contracts";
const DB_VERSION = 1;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Main API - now uses Firestore
export const saveContractToDB = async (contract: SavedContract): Promise<void> => {
  return saveContractToFirestore(contract);
};

export const getAllContracts = async (): Promise<SavedContract[]> => {
  return getAllContractsFromFirestore();
};

export const deleteContractFromDB = async (id: string): Promise<void> => {
  return deleteContractFromFirestore(id);
};

// Migration utility - migrate from IndexedDB to Firestore
export const migrateLocalToFirestore = async (): Promise<number> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    const localContracts = await new Promise<SavedContract[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    // Upload each contract to Firestore
    for (const contract of localContracts) {
      await saveContractToFirestore(contract);
    }

    return localContracts.length;
  } catch (error) {
    console.error('Migration failed:', error);
    throw new Error('Failed to migrate data to cloud');
  }
};
