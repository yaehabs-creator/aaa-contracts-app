import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabase/config';

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

export interface GroupedClause {
  categoryId: string | null;
  categoryName: string;
  clauses: LedgerClause[];
}

interface UseContractLedgerDataReturn {
  categories: LedgerCategory[];
  clauses: LedgerClause[];
  groupedByCategoryId: Map<string | null, LedgerClause[]>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch categories and clauses for the Category Ledger sidebar
 * Data is fetched from Supabase contract_categories and contract_items tables
 */
export function useContractLedgerData(contractId: string | null): UseContractLedgerDataReturn {
  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [clauses, setClauses] = useState<LedgerClause[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!contractId || !supabase) {
      setCategories([]);
      setClauses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch categories ordered by order_index
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('contract_categories')
        .select('id, contract_id, name, order_index')
        .eq('contract_id', contractId)
        .order('order_index', { ascending: true });

      if (categoriesError) {
        // Table might not exist yet - this is okay
        if (categoriesError.code === '42P01') {
          console.warn('contract_categories table does not exist yet');
          setCategories([]);
        } else {
          throw categoriesError;
        }
      } else {
        setCategories(categoriesData || []);
      }

      // Fetch clauses (contract_items) with category assignments
      // Only fetch clause-type items, not deleted
      const { data: clausesData, error: clausesError } = await supabase
        .from('contract_items')
        .select('id, contract_id, category_id, section_type, order_index, item_data')
        .eq('contract_id', contractId)
        .in('section_type', ['GENERAL', 'PARTICULAR'])
        .order('order_index', { ascending: true });

      if (clausesError) {
        throw clausesError;
      }

      // Filter out deleted clauses
      const activeClauses = (clausesData || []).filter(
        c => !c.item_data?.is_deleted
      );

      setClauses(activeClauses);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load ledger data';
      console.error('Error fetching ledger data:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  // Fetch data when contractId changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group clauses by category_id
  const groupedByCategoryId = useMemo(() => {
    const groups = new Map<string | null, LedgerClause[]>();
    
    // Initialize groups for all categories (even empty ones)
    categories.forEach(cat => {
      groups.set(cat.id, []);
    });
    
    // Add uncategorized group
    groups.set(null, []);
    
    // Distribute clauses into groups
    clauses.forEach(clause => {
      const categoryId = clause.category_id;
      if (!groups.has(categoryId)) {
        groups.set(categoryId, []);
      }
      groups.get(categoryId)!.push(clause);
    });
    
    // Sort clauses within each group by order_index, then by clause_number
    groups.forEach((groupClauses, key) => {
      groupClauses.sort((a, b) => {
        // First by order_index
        const orderDiff = (a.order_index || 0) - (b.order_index || 0);
        if (orderDiff !== 0) return orderDiff;
        
        // Then by clause_number
        const numA = a.item_data?.clause_number || '';
        const numB = b.item_data?.clause_number || '';
        return numA.localeCompare(numB, undefined, { numeric: true });
      });
    });
    
    return groups;
  }, [categories, clauses]);

  return {
    categories,
    clauses,
    groupedByCategoryId,
    loading,
    error,
    refresh: fetchData
  };
}

/**
 * Normalize clause ID for consistent matching (same as ClauseCard)
 */
function normalizeClauseId(clauseNumber: string): string {
  if (!clauseNumber) return '';
  return clauseNumber
    .replace(/\s+/g, '')  // Remove all spaces
    .replace(/[()]/g, ''); // Remove parentheses
}

/**
 * Scroll to a clause element and highlight it
 * Uses clause_number (normalized) to match ClauseCard's id attribute
 */
export function scrollToClauseByNumber(clauseNumber: string): void {
  const normalizedId = normalizeClauseId(clauseNumber);
  const element = document.getElementById(`clause-${normalizedId}`);
  
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Add highlight effect
    element.classList.add('clause-highlight');
    
    // Remove highlight after animation
    setTimeout(() => {
      element.classList.remove('clause-highlight');
    }, 2000);
  } else {
    console.warn(`Could not find clause element with id: clause-${normalizedId}`);
  }
}

/**
 * Get clause status (added, modified, gc-only) from item_data
 */
export function getClauseStatusFromItemData(itemData: LedgerClause['item_data']): 'added' | 'modified' | 'gc-only' {
  const hasPC = itemData?.particular_condition && itemData.particular_condition.length > 0;
  const hasGC = itemData?.general_condition && itemData.general_condition.length > 0;
  
  if (hasPC && !hasGC) return 'added';
  if (hasPC && hasGC) return 'modified';
  return 'gc-only';
}
