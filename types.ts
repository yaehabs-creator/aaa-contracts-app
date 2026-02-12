
export type ModificationType =
  | "ADDED_TEXT"
  | "DELETED_TEXT"
  | "CHANGED_WORDING"
  | "CHANGED_TIME_PERIOD"
  | "CHANGED_AMOUNT"
  | "NEW_CLAUSE_ONLY"
  | "DELETED_CLAUSE";

export type ModificationColor = "green" | "red" | "orange" | "purple" | "blue";

export type ConditionType = 'General' | 'Particular';

export enum SectionType {
  AGREEMENT = 'AGREEMENT',
  LOA = 'LOA',
  GENERAL = 'GENERAL',
  PARTICULAR = 'PARTICULAR',
  ADDENDUM = 'ADDENDUM',
  BOQ = 'BOQ',
  SCHEDULE = 'SCHEDULE',
  ANNEX = 'ANNEX',
  AUTOMATION = 'AUTOMATION',
  INSTRUCTION = 'INSTRUCTION'
}

export enum ItemType {
  CLAUSE = 'CLAUSE',
  PARAGRAPH = 'PARAGRAPH',
  FIELD = 'FIELD',
  IMAGE = 'IMAGE'
}

export type TimeFrameType =
  | "NOTICE_PERIOD"
  | "PAYMENT_PERIOD"
  | "RESPONSE_TIME"
  | "TIME_FOR_COMPLETION"
  | "EXTENSION_OF_TIME"
  | "DEFECTS_LIABILITY_PERIOD"
  | "GENERAL_DURATION";

export type ObligationParty =
  | "Contractor"
  | "Employer"
  | "Engineer/Project Manager"
  | "Other/Unclear";

export interface TimeFrame {
  original_phrase: string;
  type: TimeFrameType;
  applies_to: ObligationParty;
  short_explanation: string;
}

export type FinancialAssetType =
  | "cost_responsibility"
  | "deduction"
  | "penalty_or_damages"
  | "payment_entitlement"
  | "reimbursement"
  | "limit_or_cap"
  | "other";

export type CurrencyOrBasis = "percent" | "lump_sum" | "contract_price" | "N/A";

export interface FinancialAsset {
  source: "GC" | "PC";
  raw_text: string;
  type: FinancialAssetType;
  payer: string;
  payee: string | null;
  amount: number | null;
  currency_or_basis: CurrencyOrBasis;
  condition: string;
}


export interface LinkToken {
  t: 'text' | 'ref';
  v: string;
}

export interface ComparisonDetail {
  type: ModificationType;
  color: ModificationColor;
  excerpt_general: string;
  excerpt_particular: string;
  comment: string;
}

export interface Clause {
  clause_number: string;
  clause_title: string;
  condition_type: ConditionType;
  clause_text: string;
  general_condition?: string;
  particular_condition?: string;
  comparison: ComparisonDetail[];
  has_time_frame?: boolean;
  time_frames?: TimeFrame[];
  financial_assets?: FinancialAsset[];
  category?: string;
  chapter?: string;
  gc_link_tokens?: LinkToken[];
  pc_link_tokens?: LinkToken[];
}

export interface Category {
  name: string;
  clauseNumbers: string[];
}

export type CategoryAction =
  | { action: 'create_category'; category_name: string }
  | { action: 'rename_category'; old_name: string; new_name: string }
  | { action: 'delete_category'; category_name: string }
  | { action: 'add_clause'; clause_number: string; category_name: string }
  | { action: 'remove_clause'; clause_number: string; category_name: string }
  | { action: 'show_category'; category_name: string };

export interface FileData {
  data: string;
  mimeType: string;
  name?: string;
}

export interface DualSourceInput {
  general: string | FileData;
  particular: string | FileData;
  skipCleaning?: boolean;
}

export interface SectionItem {
  itemType: ItemType;
  number?: string;  // For clauses
  heading?: string;  // For paragraphs/clauses
  text?: string;  // For clauses/paragraphs
  fieldKey?: string;  // For fields
  fieldValue?: string;  // For fields
  orderIndex: number;
  // Image-specific fields (for when itemType is IMAGE)
  imageUrl?: string;
  imageAlt?: string;
  imageTitle?: string;
  // Clause-specific fields (for backward compatibility and when itemType is CLAUSE)
  clause_number?: string;
  clause_title?: string;
  condition_type?: ConditionType;
  clause_text?: string;
  general_condition?: string;
  particular_condition?: string;
  comparison?: ComparisonDetail[];
  has_time_frame?: boolean;
  time_frames?: TimeFrame[];
  financial_assets?: FinancialAsset[];
  category?: string;
  chapter?: string;
  gc_link_tokens?: LinkToken[];
  pc_link_tokens?: LinkToken[];
}

export interface ContractSection {
  sectionType: SectionType;
  title: string;
  items: SectionItem[];
}

export interface SavedContract {
  id: string;
  name: string;
  timestamp: number;
  clauses?: Clause[];  // Legacy format - kept for backward compatibility
  sections?: ContractSection[];  // New format
  metadata: {
    totalClauses: number;
    generalCount: number;
    particularCount: number;
    highRiskCount: number;
    conflictCount: number;
    timeSensitiveCount?: number;
  };
}

// Legacy contract format for migration detection
export interface LegacyContract {
  id: string;
  name: string;
  timestamp: number;
  clauses: Clause[];
  metadata: {
    totalClauses: number;
    generalCount: number;
    particularCount: number;
    highRiskCount: number;
    conflictCount: number;
    timeSensitiveCount?: number;
  };
  sections?: never;  // Explicitly no sections
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  LIBRARY = 'LIBRARY',
  PDF_PREVIEW = 'PDF_PREVIEW'
}

export interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
}

// ============================================
// Document Ingestion Types
// ============================================

/**
 * Document groups following FIDIC contract structure
 * A = Form of Agreement & Annexes
 * B = Letter of Acceptance
 * C = Conditions of Contract (GC/PC)
 * D = Addendums & Post-Tender Addendums
 * I = Bills of Quantities & Method of Measurement
 * N = Schedules, Annexes, Technical Appendices
 */
export enum DocumentGroup {
  A = 'A', // Form of Agreement
  B = 'B', // Letter of Acceptance
  C = 'C', // Conditions of Contract
  D = 'D', // Addendums
  I = 'I', // BOQ
  N = 'N'  // Schedules/Annexes
}

export const DocumentGroupLabels: Record<DocumentGroup, string> = {
  [DocumentGroup.A]: 'Form of Agreement & Annexes',
  [DocumentGroup.B]: 'Letter of Acceptance',
  [DocumentGroup.C]: 'Conditions of Contract',
  [DocumentGroup.D]: 'Addendums & Clarifications',
  [DocumentGroup.I]: 'Bills of Quantities',
  [DocumentGroup.N]: 'Schedules & Annexes'
};

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ContractDocument {
  id: string;
  contract_id: string;
  document_group: DocumentGroup;
  name: string;
  original_filename?: string;
  file_path: string;
  file_type: string;
  file_size_bytes?: number;
  page_count?: number;
  sequence_number: number;
  effective_date?: string;
  supersedes_document_id?: string;
  status: DocumentStatus;
  processing_error?: string;
  processing_metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  processed_at?: string;
}

export type ChunkContentType = 'text' | 'table' | 'form' | 'metadata' | 'heading';

export interface DocumentChunk {
  id: string;
  document_id: string;
  contract_id: string;
  chunk_index: number;
  content: string;
  content_hash?: string;
  content_type: ChunkContentType;
  clause_number?: string;
  clause_title?: string;
  page_number?: number;
  page_range_start?: number;
  page_range_end?: number;
  token_count?: number;
  confidence_score?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  created_at?: string;
}

export type ReferenceType =
  | 'mentions'        // Simple reference to another clause
  | 'overrides'       // PC overrides GC, or Addendum overrides base
  | 'supplements'     // Adds to existing clause
  | 'cross_reference' // Mutual reference
  | 'defines'         // Definition reference
  | 'amends';         // Partial modification

export interface ClauseReference {
  id: string;
  contract_id: string;
  source_clause_number: string;
  source_document_id?: string;
  source_chunk_id?: string;
  target_clause_number: string;
  target_document_id?: string;
  target_chunk_id?: string;
  reference_type: ReferenceType;
  reference_text?: string;
  is_resolved?: boolean;
  created_at?: string;
}

export type OverrideType = 'full' | 'partial' | 'clause_specific';

export interface DocumentOverride {
  id: string;
  contract_id: string;
  overriding_document_id: string;
  overridden_document_id: string;
  override_scope: string;
  override_type: OverrideType;
  affected_clauses?: string[];
  reason?: string;
  effective_date?: string;
  created_at?: string;
}

export type IngestionJobType = 'ocr' | 'parsing' | 'chunking' | 'embedding' | 'validation' | 'full_ingestion';
export type IngestionJobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface IngestionJob {
  id: string;
  contract_id: string;
  document_id?: string;
  job_type: IngestionJobType;
  status: IngestionJobStatus;
  progress: number;
  error_message?: string;
  metadata?: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

// ============================================
// Validation Types
// ============================================

export type ValidationErrorCode =
  | 'DUPLICATE_CLAUSE'
  | 'UNRESOLVED_REFERENCE'
  | 'ADDENDUM_ORDER'
  | 'MISSING_PC_OVERRIDE'
  | 'OCR_CONFIDENCE_LOW'
  | 'DUPLICATE_CHUNK'
  | 'INVALID_CLAUSE_NUMBER'
  | 'MISSING_REQUIRED_FIELD'
  | 'TABLE_EXTRACTION_FAILED'
  | 'NAMING_CONVENTION_VIOLATION';

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  items: any[];
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalDocuments: number;
    totalChunks: number;
    totalReferences: number;
    unresolvedReferences: number;
    lowConfidenceChunks: number;
  };
}

// ============================================
// Search Types
// ============================================

export interface ChunkSearchResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  document_group: DocumentGroup;
  clause_number?: string;
  content: string;
  similarity: number;
  is_overridden?: boolean;
  overridden_by?: string[];
}

export interface EffectiveClause {
  chunk_id: string;
  document_id: string;
  document_name: string;
  document_group: DocumentGroup;
  content: string;
  is_overridden: boolean;
  overridden_by: string[];
}

// ============================================
// File Upload Types
// ============================================

export interface FileUploadRequest {
  file: File;
  contractId: string;
  documentGroup: DocumentGroup;
  sequenceNumber?: number;
  effectiveDate?: string;
  supersedesDocumentId?: string;
}

export interface FileUploadResult {
  success: boolean;
  documentId?: string;
  filePath?: string;
  error?: string;
}

export interface BatchUploadProgress {
  totalFiles: number;
  completedFiles: number;
  currentFile?: string;
  errors: Array<{ filename: string; error: string }>;
}

// ============================================
// Naming Convention Validation
// ============================================

export interface FileNamingValidation {
  isValid: boolean;
  suggestedName?: string;
  errors: string[];
  parsed?: {
    group: DocumentGroup;
    sequence: number;
    name: string;
    extension: string;
  };
}

/**
 * Validates a filename against the naming convention:
 * {GROUP}{SEQUENCE}_{Document_Name}.{ext}
 * Example: A001_Form_of_Agreement.pdf
 */
export function validateFileName(filename: string): FileNamingValidation {
  const pattern = /^([ABCDIN])(\d{3})_([A-Za-z0-9_-]+)\.([a-zA-Z0-9]+)$/;
  const match = filename.match(pattern);

  if (!match) {
    // Try to generate a suggested name
    const ext = filename.split('.').pop() || 'pdf';
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^A-Za-z0-9_-]/g, '_');

    return {
      isValid: false,
      suggestedName: `X001_${baseName}.${ext}`,
      errors: [
        'Filename must follow pattern: {GROUP}{SEQ}_{Name}.{ext}',
        'GROUP must be A, B, C, D, I, or N',
        'SEQ must be 3 digits (001-999)',
        'Name must use underscores, no spaces'
      ]
    };
  }

  const [, group, seq, name, ext] = match;

  return {
    isValid: true,
    parsed: {
      group: group as DocumentGroup,
      sequence: parseInt(seq, 10),
      name,
      extension: ext
    }
  };
}
