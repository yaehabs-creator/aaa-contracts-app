
export type ModificationType =
  | "ADDED_TEXT"
  | "DELETED_TEXT"
  | "CHANGED_WORDING"
  | "CHANGED_TIME_PERIOD"
  | "CHANGED_AMOUNT"
  | "NEW_CLAUSE_ONLY"
  | "DELETED_CLAUSE";

export type ModificationColor = "green" | "red" | "orange" | "purple" | "blue";

export type ConditionType = 'General' | 'Particular' | 'Both';

export enum SectionType {
  AGREEMENT = 'AGREEMENT',
  LOA = 'LOA',
  TENDER = 'TENDER',
  GENERAL = 'GENERAL',
  PARTICULAR = 'PARTICULAR',
  REQUIREMENTS = 'REQUIREMENTS',
  PROPOSAL = 'PROPOSAL',
  DRAWINGS = 'DRAWINGS',
  SPECIFICATION = 'SPECIFICATION',
  ADDENDUM = 'ADDENDUM',
  BOQ = 'BOQ',
  SCHEDULE = 'SCHEDULE',
  ANNEX = 'ANNEX',
  AUTOMATION = 'AUTOMATION',
  INSTRUCTION = 'INSTRUCTION',
  EXTRAS = 'EXTRAS'
}

export enum ItemType {
  CLAUSE = 'CLAUSE',
  PARAGRAPH = 'PARAGRAPH',
  FIELD = 'FIELD',
  IMAGE = 'IMAGE',
  PDF = 'PDF'
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
  section?: string;
  isHidden?: boolean;
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
  id?: string;
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
  // Extraction metadata
  confidence?: number;
  evidence?: {
    page: number;
    snippet: string;
  };
  status?: 'extracted' | 'missing' | 'manual' | 'uncertain';
  doc_url?: string;
  doc_name?: string;
  isHidden?: boolean;
}

export interface ContractSection {
  sectionType: SectionType;
  title: string;
  items: SectionItem[];
}

export interface IngestionProgress {
  expected_sections: string[];
  completed_sections: string[];
  errors: Array<{ section: string; message: string }>;
}

export interface SavedContract {
  id: string;
  name: string;
  title: string;
  project_id?: string;
  contractor_id?: string;
  contractor_name?: string;
  contract_number?: string;
  status: 'draft' | 'ready' | 'processing' | 'partial_failure';
  ingestion_progress: IngestionProgress;
  start_date?: string;
  end_date?: string;
  currency?: string;
  value?: number;
  scope_text?: string;
  timestamp: number;
  clauses?: Clause[];  // For backward compatibility
  sections?: ContractSection[];  // For backward compatibility
  metadata: {
    totalClauses: number;
    generalCount: number;
    particularCount: number;
    highRiskCount: number;
    conflictCount: number;
    timeSensitiveCount?: number;
  };
  version: number;
  is_deleted: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
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
  PDF_PREVIEW = 'PDF_PREVIEW',
  ORGANIZER = 'ORGANIZER',
  INGESTION = 'INGESTION'
}

export interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
}

export interface ContextPill {
  id: string;
  label: string;
  type: 'clause' | 'document' | 'general' | 'context';
}

// ============================================
// New Verified Ingestion Types
// ============================================

export interface IngestionSection {
  id: string;
  contract_id: string;
  section_key: string;
  file_name: string;
  file_url: string;
  file_hash: string;
  file_size: number;
  status: 'uploaded' | 'extracting' | 'completed' | 'failed' | 'repairing';
  chunk_metadata: Record<string, any>;
  created_at: string;
}

export interface IngestionClause {
  id: string;
  contract_id: string;
  section_id: string;
  section_key: string;
  clause_number: string;
  parent_clause_number?: string;
  title: string;
  content: string;
  page_start?: number;
  page_end?: number;
  created_at: string;
}

// ============================================
// Contract Organizer Types
// ============================================

export interface ContractTemplate {
  id: string;
  name: string;
  description?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizerFolderLayout {
  code: string;        // matches FIXED_FOLDERS code (e.g. 'A', 'B', 'AI')
  isVisible: boolean;
  order: number;       // 0-based display order
}

export interface ContractSubfolder {
  id: string;
  template_id: string;
  folder_code: 'A' | 'B' | 'C' | 'D' | 'I' | 'N' | 'P' | 'AI' | 'DATA' | 'O' | 'T' | 'R' | 'S' | 'Q' | 'E' | 'J' | 'K';
  name: string;
  order_index: number;
  isVisible?: boolean;
}

export interface FolderSchemaField {
  id: string;
  subfolder_id: string;
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'select' | 'boolean' | 'list' | 'object';
  required: boolean;
  allowed_values?: any[];
  help_text?: string;
}

export interface ExtractedData {
  id: string;
  contract_id: string;
  doc_id?: string;
  subfolder_id: string | null;
  field_key: string;
  value: any;
  confidence: number;
  evidence: {
    page: number;
    snippet: string;
  };
  status: 'extracted' | 'missing' | 'uncertain';
  doc_url?: string;
  doc_name?: string;
  isHidden?: boolean;
  created_at?: string;
  updated_at?: string;
}

