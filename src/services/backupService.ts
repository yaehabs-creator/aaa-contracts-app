import { SavedContract } from '../../types';
import { saveContractToDB, getAllContracts } from '../../services/dbService';

export interface BackupFile {
  version: string;
  exportDate: string;
  exportedBy: string;
  contractCount: number;
  contracts: SavedContract[];
}

/**
 * Export contracts to JSON format for backup
 */
export const exportContractsToJSON = async (
  contracts: SavedContract[],
  exportedBy: string
): Promise<string> => {
  const backup: BackupFile = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    exportedBy: exportedBy,
    contractCount: contracts.length,
    contracts: contracts
  };

  return JSON.stringify(backup, null, 2);
};

/**
 * Export all contracts to JSON
 */
export const exportAllContractsToJSON = async (exportedBy: string): Promise<string> => {
  const allContracts = await getAllContracts();
  return exportContractsToJSON(allContracts, exportedBy);
};

/**
 * Download JSON backup file
 */
export const downloadBackupFile = (jsonContent: string, filename?: string): void => {
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `contract-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parse and validate JSON backup file
 */
export const importContractsFromJSON = async (file: File): Promise<BackupFile> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup: BackupFile = JSON.parse(content);
        
        // Validate backup structure
        if (!backup.version || !backup.contracts || !Array.isArray(backup.contracts)) {
          reject(new Error('Invalid backup file format. Missing required fields.'));
          return;
        }

        // Validate each contract
        for (const contract of backup.contracts) {
          if (!contract.id || !contract.name || !contract.clauses || !contract.metadata) {
            reject(new Error(`Invalid contract in backup: ${contract.name || 'Unknown'}. Missing required fields.`));
            return;
          }
        }

        resolve(backup);
      } catch (error: any) {
        reject(new Error(`Failed to parse JSON file: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read backup file'));
    };

    reader.readAsText(file);
  });
};

/**
 * Restore mode options
 */
export type RestoreMode = 'replace' | 'merge' | 'add-only';

/**
 * Restore contracts to database
 */
export const restoreContracts = async (
  contracts: SavedContract[],
  mode: RestoreMode = 'merge',
  onProgress?: (current: number, total: number) => void
): Promise<{ restored: number; skipped: number; errors: string[] }> => {
  const result = {
    restored: 0,
    skipped: 0,
    errors: [] as string[]
  };

  // Get existing contracts to check for duplicates
  let existingContracts: SavedContract[] = [];
  if (mode === 'merge' || mode === 'add-only') {
    try {
      existingContracts = await getAllContracts();
    } catch (error) {
      result.errors.push('Failed to fetch existing contracts for duplicate check');
    }
  }

  const existingIds = new Set(existingContracts.map(c => c.id));
  // Track processed IDs in this batch to prevent duplicates within the same restore
  const processedIds = new Set<string>();
  
  // Deduplicate contracts array first (in case backup file has duplicates)
  const uniqueContracts = contracts.filter((contract, index, self) => 
    index === self.findIndex(c => c.id === contract.id)
  );

  console.log(`Restoring ${uniqueContracts.length} unique contracts (${contracts.length} total in backup)`);

  for (let i = 0; i < uniqueContracts.length; i++) {
    const contract = uniqueContracts[i];
    
    try {
      // Skip if already processed in this batch
      if (processedIds.has(contract.id)) {
        result.skipped++;
        onProgress?.(i + 1, uniqueContracts.length);
        continue;
      }

      // Check for duplicates with existing contracts
      if (mode === 'add-only' && existingIds.has(contract.id)) {
        result.skipped++;
        onProgress?.(i + 1, uniqueContracts.length);
        continue;
      }

      // Use setDoc which will overwrite if ID exists, or create if it doesn't
      await saveContractToDB(contract);
      result.restored++;
      
      // Mark as processed
      processedIds.add(contract.id);
      existingIds.add(contract.id);

      onProgress?.(i + 1, uniqueContracts.length);
    } catch (error: any) {
      result.errors.push(`Failed to restore contract "${contract.name}": ${error.message}`);
    }
  }

  return result;
};

/**
 * Validate backup file before restore
 */
export const validateBackupFile = (backup: BackupFile): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!backup.version) {
    errors.push('Missing version field');
  }

  if (!backup.contracts || !Array.isArray(backup.contracts)) {
    errors.push('Missing or invalid contracts array');
  }

  if (backup.contracts) {
    backup.contracts.forEach((contract, index) => {
      if (!contract.id) {
        errors.push(`Contract ${index + 1}: Missing ID`);
      }
      if (!contract.name) {
        errors.push(`Contract ${index + 1}: Missing name`);
      }
      if (!contract.clauses || !Array.isArray(contract.clauses)) {
        errors.push(`Contract ${index + 1}: Missing or invalid clauses`);
      }
      if (!contract.metadata) {
        errors.push(`Contract ${index + 1}: Missing metadata`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
