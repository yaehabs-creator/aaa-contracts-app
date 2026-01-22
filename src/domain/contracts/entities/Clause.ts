/**
 * Domain entity representing a contract clause
 * Pure business logic, no infrastructure dependencies
 */

export type ConditionType = 'General' | 'Particular';

export type ModificationType = 
  | "ADDED_TEXT" 
  | "DELETED_TEXT" 
  | "CHANGED_WORDING" 
  | "CHANGED_TIME_PERIOD" 
  | "CHANGED_AMOUNT" 
  | "NEW_CLAUSE_ONLY" 
  | "DELETED_CLAUSE";

export type ModificationColor = "green" | "red" | "orange" | "purple" | "blue";

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

export type FinancialAssetType = 
  | "cost_responsibility"
  | "deduction"
  | "penalty_or_damages"
  | "payment_entitlement"
  | "reimbursement"
  | "limit_or_cap"
  | "other";

export type CurrencyOrBasis = "percent" | "lump_sum" | "contract_price" | "N/A";

export interface TimeFrame {
  original_phrase: string;
  type: TimeFrameType;
  applies_to: ObligationParty;
  short_explanation: string;
}

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

export class Clause {
  constructor(
    public readonly clauseNumber: string,
    public readonly clauseTitle: string,
    public readonly conditionType: ConditionType,
    public readonly clauseText: string,
    public readonly generalCondition?: string,
    public readonly particularCondition?: string,
    public readonly comparison: ComparisonDetail[] = [],
    public readonly hasTimeFrame: boolean = false,
    public readonly timeFrames: TimeFrame[] = [],
    public readonly financialAssets: FinancialAsset[] = [],
    public readonly category?: string,
    public readonly chapter?: string
  ) {}

  /**
   * Check if clause has conflicts between general and particular conditions
   */
  hasConflicts(): boolean {
    return this.comparison.some(
      c => c.type === "CHANGED_WORDING" || 
           c.type === "CHANGED_TIME_PERIOD" || 
           c.type === "CHANGED_AMOUNT"
    );
  }

  /**
   * Check if clause is time-sensitive
   */
  isTimeSensitive(): boolean {
    return this.hasTimeFrame && this.timeFrames.length > 0;
  }

  /**
   * Check if clause has financial implications
   */
  hasFinancialImplications(): boolean {
    return this.financialAssets.length > 0;
  }
}
