import { useState, useCallback, useEffect } from 'react';
import { adminEditorService, ContractSummary, EditorCategory, EditorClause } from '../services/adminEditorService';
import { useAuth } from '../contexts/AuthContext';

export type EditorLoadingState = 'idle' | 'loading' | 'loaded' | 'error';

interface UseAdminEditorReturn {
  // Data
  contracts: ContractSummary[];
  selectedContractId: string | null;
  categories: EditorCategory[];
  clauses: EditorClause[];
  selectedCategoryId: string | null;
  
  // Loading states
  contractsLoading: EditorLoadingState;
  categoriesLoading: EditorLoadingState;
  clausesLoading: EditorLoadingState;
  
  // Errors
  error: string | null;
  
  // Actions
  loadContracts: () => Promise<void>;
  selectContract: (contractId: string) => Promise<void>;
  selectCategory: (categoryId: string | null) => void;
  
  // Category operations
  createCategory: (name: string) => Promise<EditorCategory | null>;
  renameCategory: (categoryId: string, newName: string) => Promise<boolean>;
  reorderCategories: (orderedIds: string[]) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  syncCategories: () => Promise<void>;
  
  // Clause operations
  updateClauseText: (itemId: string, field: string, value: string) => Promise<boolean>;
  assignClauseToCategory: (itemId: string, categoryId: string) => Promise<boolean>;
  removeClauseFromCategory: (itemId: string) => Promise<boolean>;
  reorderClausesInCategory: (categoryId: string, orderedIds: string[]) => Promise<boolean>;
  deleteClause: (itemId: string) => Promise<boolean>;
  
  // Refresh
  refreshCategories: () => Promise<void>;
  refreshClauses: () => Promise<void>;
}

/**
 * Custom hook for managing Admin Editor state and operations
 */
export function useAdminEditor(): UseAdminEditorReturn {
  const { user } = useAuth();
  
  // Data state
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [categories, setCategories] = useState<EditorCategory[]>([]);
  const [clauses, setClauses] = useState<EditorClause[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Loading states
  const [contractsLoading, setContractsLoading] = useState<EditorLoadingState>('idle');
  const [categoriesLoading, setCategoriesLoading] = useState<EditorLoadingState>('idle');
  const [clausesLoading, setClausesLoading] = useState<EditorLoadingState>('idle');
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Load contracts
  const loadContracts = useCallback(async () => {
    setContractsLoading('loading');
    setError(null);
    
    try {
      const data = await adminEditorService.fetchContracts();
      setContracts(data);
      setContractsLoading('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contracts';
      setError(message);
      setContractsLoading('error');
    }
  }, []);

  // Select a contract and load its data
  const selectContract = useCallback(async (contractId: string) => {
    setSelectedContractId(contractId);
    setSelectedCategoryId(null);
    setCategoriesLoading('loading');
    setClausesLoading('loading');
    setError(null);
    
    try {
      // Load categories and clauses in parallel
      const [categoriesData, clausesData] = await Promise.all([
        adminEditorService.fetchCategories(contractId),
        adminEditorService.fetchClauses(contractId)
      ]);
      
      setCategories(categoriesData);
      setClauses(clausesData);
      setCategoriesLoading('loaded');
      setClausesLoading('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load contract data';
      setError(message);
      setCategoriesLoading('error');
      setClausesLoading('error');
    }
  }, []);

  // Select a category
  const selectCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  // Refresh categories
  const refreshCategories = useCallback(async () => {
    if (!selectedContractId) return;
    
    try {
      const data = await adminEditorService.fetchCategories(selectedContractId);
      setCategories(data);
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  }, [selectedContractId]);

  // Refresh clauses
  const refreshClauses = useCallback(async () => {
    if (!selectedContractId) return;
    
    try {
      const data = await adminEditorService.fetchClauses(selectedContractId);
      setClauses(data);
    } catch (err) {
      console.error('Failed to refresh clauses:', err);
    }
  }, [selectedContractId]);

  // Create category
  const createCategory = useCallback(async (name: string): Promise<EditorCategory | null> => {
    if (!selectedContractId) return null;
    
    try {
      const newCategory = await adminEditorService.createCategory(
        selectedContractId,
        name,
        user?.uid
      );
      await refreshCategories();
      return newCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      setError(message);
      return null;
    }
  }, [selectedContractId, user?.uid, refreshCategories]);

  // Rename category
  const renameCategory = useCallback(async (categoryId: string, newName: string): Promise<boolean> => {
    try {
      await adminEditorService.renameCategory(categoryId, newName, user?.uid);
      await refreshCategories();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rename category';
      setError(message);
      return false;
    }
  }, [user?.uid, refreshCategories]);

  // Reorder categories
  const reorderCategories = useCallback(async (orderedIds: string[]): Promise<boolean> => {
    if (!selectedContractId) return false;
    
    try {
      await adminEditorService.reorderCategories(selectedContractId, orderedIds, user?.uid);
      await refreshCategories();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder categories';
      setError(message);
      return false;
    }
  }, [selectedContractId, user?.uid, refreshCategories]);

  // Delete category
  const deleteCategory = useCallback(async (categoryId: string): Promise<boolean> => {
    try {
      await adminEditorService.deleteCategory(categoryId);
      await refreshCategories();
      await refreshClauses();
      
      // Clear selection if deleted category was selected
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
      }
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      setError(message);
      return false;
    }
  }, [selectedCategoryId, refreshCategories, refreshClauses]);

  // Sync categories from existing clause data
  const syncCategories = useCallback(async () => {
    if (!selectedContractId) return;
    
    setCategoriesLoading('loading');
    try {
      const syncedCategories = await adminEditorService.syncCategoriesFromClauses(
        selectedContractId,
        user?.uid
      );
      setCategories(syncedCategories);
      await refreshClauses();
      setCategoriesLoading('loaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync categories';
      setError(message);
      setCategoriesLoading('error');
    }
  }, [selectedContractId, user?.uid, refreshClauses]);

  // Update clause text
  const updateClauseText = useCallback(async (
    itemId: string,
    field: string,
    value: string
  ): Promise<boolean> => {
    try {
      await adminEditorService.updateClauseText(itemId, { [field]: value });
      
      // Update local state optimistically
      setClauses(prev => prev.map(clause => {
        if (clause.id === itemId) {
          return {
            ...clause,
            item_data: {
              ...clause.item_data,
              [field]: value
            }
          };
        }
        return clause;
      }));
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update clause';
      setError(message);
      return false;
    }
  }, []);

  // Assign clause to category
  const assignClauseToCategory = useCallback(async (
    itemId: string,
    categoryId: string
  ): Promise<boolean> => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return false;
    
    try {
      await adminEditorService.assignClauseToCategory(itemId, categoryId, category.name);
      await refreshClauses();
      await refreshCategories();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to assign clause';
      setError(message);
      return false;
    }
  }, [categories, refreshClauses, refreshCategories]);

  // Remove clause from category
  const removeClauseFromCategory = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      await adminEditorService.removeClauseFromCategory(itemId);
      await refreshClauses();
      await refreshCategories();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove clause from category';
      setError(message);
      return false;
    }
  }, [refreshClauses, refreshCategories]);

  // Reorder clauses in category
  const reorderClausesInCategory = useCallback(async (
    categoryId: string,
    orderedIds: string[]
  ): Promise<boolean> => {
    try {
      await adminEditorService.reorderClausesInCategory(categoryId, orderedIds);
      await refreshClauses();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reorder clauses';
      setError(message);
      return false;
    }
  }, [refreshClauses]);

  // Delete clause
  const deleteClause = useCallback(async (itemId: string): Promise<boolean> => {
    try {
      await adminEditorService.deleteClause(itemId);
      await refreshClauses();
      await refreshCategories();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete clause';
      setError(message);
      return false;
    }
  }, [refreshClauses, refreshCategories]);

  // Load contracts on mount
  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  return {
    // Data
    contracts,
    selectedContractId,
    categories,
    clauses,
    selectedCategoryId,
    
    // Loading states
    contractsLoading,
    categoriesLoading,
    clausesLoading,
    
    // Errors
    error,
    
    // Actions
    loadContracts,
    selectContract,
    selectCategory,
    
    // Category operations
    createCategory,
    renameCategory,
    reorderCategories,
    deleteCategory,
    syncCategories,
    
    // Clause operations
    updateClauseText,
    assignClauseToCategory,
    removeClauseFromCategory,
    reorderClausesInCategory,
    deleteClause,
    
    // Refresh
    refreshCategories,
    refreshClauses
  };
}

export default useAdminEditor;
