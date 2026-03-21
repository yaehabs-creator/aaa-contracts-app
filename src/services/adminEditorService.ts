
/**
 * Admin Editor Service (Local Mock)
 * Supabase has been removed. All contract editing is now handled locally.
 */

export interface ContractSummary {
  id: string;
  name: string;
  timestamp: number;
}

export interface EditorCategory {
  id: string;
  contract_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  clause_count?: number;
}

export interface EditorClause {
  id: string;
  contract_id: string;
  section_type: string;
  order_index: number;
  category_id: string | null;
  item_data: {
    itemType: string;
    clause_number?: string;
    clause_title?: string;
    clause_text?: string;
    general_condition?: string;
    particular_condition?: string;
    condition_type?: string;
    category?: string;
    [key: string]: any;
  };
}

class AdminEditorService {
  async fetchContracts(): Promise<ContractSummary[]> {
    return [];
  }

  async fetchCategories(): Promise<EditorCategory[]> {
    return [];
  }

  async fetchClauses(): Promise<EditorClause[]> {
    return [];
  }

  async fetchClausesByCategory(): Promise<EditorClause[]> {
    return [];
  }

  async createCategory(): Promise<any> {
    return {};
  }

  async renameCategory(): Promise<void> {}
  async reorderCategories(): Promise<void> {}
  async deleteCategory(): Promise<void> {}
  async updateClauseText(): Promise<void> {}
  async moveClause(): Promise<void> {}
  async reorderClausesInCategory(): Promise<void> {}
  async assignClauseToCategory(): Promise<void> {}
  async removeClauseFromCategory(): Promise<void> {}
  async deleteClause(): Promise<void> {}
  async hardDeleteClause(): Promise<void> {}
  async syncCategoriesFromClauses(): Promise<any[]> { return []; }
  async createClause(): Promise<any> { return {}; }
  async createClauseAtPosition(): Promise<any> { return {}; }
  async updateClauseHyperlinks(): Promise<number> { return 0; }
}

export const adminEditorService = new AdminEditorService();
export default AdminEditorService;
