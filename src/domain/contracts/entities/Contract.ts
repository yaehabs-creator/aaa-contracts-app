import { Clause } from './Clause';

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

export interface SectionItem {
  itemType: ItemType;
  number?: string;
  heading?: string;
  text?: string;
  fieldKey?: string;
  fieldValue?: string;
  orderIndex: number;
  imageUrl?: string;
  imageAlt?: string;
  imageTitle?: string;
  clause_number?: string;
  clause_title?: string;
  condition_type?: string;
  clause_text?: string;
  general_condition?: string;
  particular_condition?: string;
  comparison?: any[];
  has_time_frame?: boolean;
  time_frames?: any[];
  financial_assets?: any[];
  category?: string;
  chapter?: string;
}

export interface ContractSection {
  sectionType: SectionType;
  title: string;
  items: SectionItem[];
}

export interface ContractMetadata {
  totalClauses: number;
  generalCount: number;
  particularCount: number;
  highRiskCount: number;
  conflictCount: number;
  timeSensitiveCount?: number;
}

/**
 * Domain entity representing a contract
 * Pure business logic, no infrastructure dependencies
 */
export class Contract {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly timestamp: number,
    public readonly metadata: ContractMetadata,
    public readonly sections: ContractSection[] = [],
    public readonly clauses: Clause[] = [] // Legacy format
  ) {}

  /**
   * Get all clauses from all sections
   */
  getAllClauses(): Clause[] {
    if (this.clauses.length > 0) {
      return this.clauses;
    }

    const clauses: Clause[] = [];
    for (const section of this.sections) {
      for (const item of section.items) {
        if (item.itemType === ItemType.CLAUSE && item.clause_number) {
          // Convert SectionItem to Clause if needed
          // This is a simplified version - full conversion would need more logic
        }
      }
    }
    return clauses;
  }

  /**
   * Get clauses with conflicts
   */
  getConflictingClauses(): Clause[] {
    return this.getAllClauses().filter(clause => clause.hasConflicts());
  }

  /**
   * Get time-sensitive clauses
   */
  getTimeSensitiveClauses(): Clause[] {
    return this.getAllClauses().filter(clause => clause.isTimeSensitive());
  }

  /**
   * Get clauses with financial implications
   */
  getFinancialClauses(): Clause[] {
    return this.getAllClauses().filter(clause => clause.hasFinancialImplications());
  }

  /**
   * Check if contract has any conflicts
   */
  hasConflicts(): boolean {
    return this.metadata.conflictCount > 0;
  }

  /**
   * Check if contract is high risk
   */
  isHighRisk(): boolean {
    return this.metadata.highRiskCount > 0;
  }
}
