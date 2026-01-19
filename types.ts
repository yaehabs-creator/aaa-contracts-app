
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
  PARTICULAR = 'PARTICULAR'
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
  LIBRARY = 'LIBRARY'
}

export interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
}
