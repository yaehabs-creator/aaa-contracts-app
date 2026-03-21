
import { useState, useMemo, useCallback } from 'react';

// Types for the Category Ledger
export interface LedgerCategory {
  id: string;
  contract_id: string;
  name: string;
  order_index: number;
}

export interface LedgerClause {
  id: string;
  contract_id: string;
  category_id: string | null;
  section_type: string;
  order_index: number;
  item_data: {
    clause_number?: string;
    clause_title?: string;
    clause_text?: string;
    general_condition?: string;
    particular_condition?: string;
    [key: string]: any;
  };
}

interface UseContractLedgerDataReturn {
  categories: LedgerCategory[];
  clauses: LedgerClause[];
  groupedByCategoryId: Map<string | null, LedgerClause[]>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useContractLedgerData(contractId: string | null): UseContractLedgerDataReturn {
  const [categories] = useState<LedgerCategory[]>([]);
  const [clauses] = useState<LedgerClause[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // Local metadata from contracts table in IndexedDB or file system
    // For now returning empty until fully integrated with the ledger logic
  }, []);

  const groupedByCategoryId = useMemo(() => {
    const groups = new Map<string | null, LedgerClause[]>();
    groups.set(null, []);
    return groups;
  }, []);

  return {
    categories,
    clauses,
    groupedByCategoryId,
    loading,
    error,
    refresh: fetchData
  };
}

export function scrollToClauseByNumber(clauseNumber: string): void {
  const normalizedId = clauseNumber.replace(/\s+/g, '').replace(/[()]/g, '');
  const element = document.getElementById(`clause-${normalizedId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    element.classList.add('clause-highlight');
    setTimeout(() => { element.classList.remove('clause-highlight'); }, 2000);
  }
}

export function getClauseStatusFromItemData(itemData: LedgerClause['item_data']): 'added' | 'modified' | 'gc-only' {
  const hasPC = itemData?.particular_condition && itemData.particular_condition.length > 0;
  const hasGC = itemData?.general_condition && itemData.general_condition.length > 0;
  if (hasPC && !hasGC) return 'added';
  if (hasPC && hasGC) return 'modified';
  return 'gc-only';
}
