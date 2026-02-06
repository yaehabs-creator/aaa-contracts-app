import { analyzeContract } from './claudeService';
import { SavedContract, Clause, DualSourceInput, ConditionType, ContractSection, SectionItem, SectionType, ItemType } from '../types';
import { downloadBackupFile } from '../src/services/backupService';
import { ensureContractHasSections } from './contractMigrationService';

/**
 * Generate a unique contract ID
 */
function generateContractId(): string {
  return `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate metadata from clauses
 */
function generateContractMetadata(clauses: Clause[]): SavedContract['metadata'] {
  const totalClauses = clauses.length;
  let generalCount = 0;
  let particularCount = 0;
  let highRiskCount = 0;
  let conflictCount = 0;
  let timeSensitiveCount = 0;

  clauses.forEach(clause => {
    if (clause.condition_type === 'General') {
      generalCount++;
    } else if (clause.condition_type === 'Particular') {
      particularCount++;
    }

    // Check for time-sensitive clauses
    if (clause.has_time_frame && clause.time_frames && clause.time_frames.length > 0) {
      timeSensitiveCount++;
    }

    // Check for conflicts (clauses with both general and particular conditions that differ)
    if (clause.general_condition && clause.particular_condition &&
      clause.general_condition.trim() !== clause.particular_condition.trim()) {
      conflictCount++;
      highRiskCount++; // Conflicts are considered high-risk
    }
  });

  return {
    totalClauses,
    generalCount,
    particularCount,
    highRiskCount,
    conflictCount,
    timeSensitiveCount
  };
}

/**
 * Build a SavedContract from raw text inputs
 */
export async function buildContractFromText(
  generalText: string,
  particularText: string,
  contractName: string = "Atrium's Contract",
  contractId?: string
): Promise<SavedContract> {
  // Validate inputs
  if (!generalText.trim() && !particularText.trim()) {
    throw new Error('At least one of general or particular text must be provided');
  }

  // Create DualSourceInput
  const input: DualSourceInput = {
    general: generalText.trim(),
    particular: particularText.trim()
  };

  // Extract clauses using existing analyzeContract function
  const clauses = await analyzeContract(input);

  if (!clauses || clauses.length === 0) {
    throw new Error('No clauses were extracted from the provided text');
  }

  // Generate metadata
  const metadata = generateContractMetadata(clauses);

  // Generate ID if not provided
  const id = contractId || generateContractId();

  // Separate clauses by condition type
  const generalClauses: Clause[] = [];
  const particularClauses: Clause[] = [];

  clauses.forEach(clause => {
    const type = (clause.condition_type || '').toLowerCase();

    // Check if clause has particular content, which might imply it belongs in Particular section
    // if strictly purely particular. However, usually 'Particular' type means "New Addition".
    // 'General' type means baseline, potentially with modifications in particular_condition field.

    if (type === 'particular' || type === 'particular conditions') {
      particularClauses.push(clause);
    } else {
      // Default to General for 'general', 'both', 'modified', or unknown types
      // This ensures we never drop extracted data.
      generalClauses.push(clause);
    }
  });

  // Convert clauses to section items
  const generalItems: SectionItem[] = generalClauses.map((clause, index) => ({
    itemType: ItemType.CLAUSE,
    orderIndex: index,
    number: clause.clause_number,
    heading: clause.clause_title,
    text: clause.clause_text,
    clause_number: clause.clause_number,
    clause_title: clause.clause_title,
    condition_type: clause.condition_type,
    clause_text: clause.clause_text,
    general_condition: clause.general_condition,
    particular_condition: clause.particular_condition,
    comparison: clause.comparison,
    has_time_frame: clause.has_time_frame,
    time_frames: clause.time_frames,
    financial_assets: clause.financial_assets,
    category: clause.category,
    chapter: clause.chapter
  }));

  const particularItems: SectionItem[] = particularClauses.map((clause, index) => ({
    itemType: ItemType.CLAUSE,
    orderIndex: index,
    number: clause.clause_number,
    heading: clause.clause_title,
    text: clause.clause_text,
    clause_number: clause.clause_number,
    clause_title: clause.clause_title,
    condition_type: clause.condition_type,
    clause_text: clause.clause_text,
    general_condition: clause.general_condition,
    particular_condition: clause.particular_condition,
    comparison: clause.comparison,
    has_time_frame: clause.has_time_frame,
    time_frames: clause.time_frames,
    financial_assets: clause.financial_assets,
    category: clause.category,
    chapter: clause.chapter
  }));

  // Create sections array
  const sections: ContractSection[] = [
    {
      sectionType: SectionType.AGREEMENT,
      title: 'Form of Agreement',
      items: []
    },
    {
      sectionType: SectionType.LOA,
      title: 'Letter of Acceptance',
      items: []
    },
    {
      sectionType: SectionType.GENERAL,
      title: 'General Conditions',
      items: generalItems
    },
    {
      sectionType: SectionType.PARTICULAR,
      title: 'Particular Conditions',
      items: particularItems
    }
  ];

  // Create SavedContract with sections
  const contract: SavedContract = {
    id,
    name: contractName,
    timestamp: Date.now(),
    clauses,  // Keep for backward compatibility
    sections,
    metadata
  };

  // Ensure contract has all required sections
  return ensureContractHasSections(contract);
}

/**
 * Export a contract to a JSON file (downloads the file)
 */
export function exportContractToJSONFile(
  contract: SavedContract,
  filename?: string
): void {
  // Generate filename if not provided
  const fileTimestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = filename || `${contract.name.replace(/[^a-z0-9]/gi, '_')}_${fileTimestamp}.json`;

  // Convert contract to JSON string (matching Hassan Allam format - single contract object)
  const jsonContent = JSON.stringify(contract, null, 2);

  // Use existing download function
  downloadBackupFile(jsonContent, defaultFilename);
}

/**
 * Export a contract to JSON string (returns the string)
 */
export function exportContractToJSONString(contract: SavedContract): string {
  return JSON.stringify(contract, null, 2);
}