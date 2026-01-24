import { supabase } from '../supabase/config';

// Types for Admin Editor
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

/**
 * Admin Editor Service
 * Provides all CRUD operations for the Admin Contract Editor
 * All write operations require admin role (enforced by RLS)
 */
class AdminEditorService {
  /**
   * Fetch all contracts (id and name only)
   */
  async fetchContracts(): Promise<ContractSummary[]> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('id, name, timestamp')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching contracts:', error);
      throw new Error(`Failed to fetch contracts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Fetch categories for a contract (ordered by order_index)
   */
  async fetchCategories(contractId: string): Promise<EditorCategory[]> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const { data, error } = await supabase
      .from('contract_categories')
      .select('*')
      .eq('contract_id', contractId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    // Get clause counts for each category
    const categories = data || [];
    for (const category of categories) {
      const { count } = await supabase
        .from('contract_items')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id);
      category.clause_count = count || 0;
    }

    return categories;
  }

  /**
   * Fetch clauses for a contract
   */
  async fetchClauses(contractId: string): Promise<EditorClause[]> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const { data, error } = await supabase
      .from('contract_items')
      .select('*')
      .eq('contract_id', contractId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching clauses:', error);
      throw new Error(`Failed to fetch clauses: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Fetch clauses for a specific category
   */
  async fetchClausesByCategory(categoryId: string): Promise<EditorClause[]> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const { data, error } = await supabase
      .from('contract_items')
      .select('*')
      .eq('category_id', categoryId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching clauses by category:', error);
      throw new Error(`Failed to fetch clauses: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new category
   */
  async createCategory(contractId: string, name: string, userId?: string): Promise<EditorCategory> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Get the highest order_index for this contract
    const { data: existing } = await supabase
      .from('contract_categories')
      .select('order_index')
      .eq('contract_id', contractId)
      .order('order_index', { ascending: false })
      .limit(1);

    const nextOrderIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

    const { data, error } = await supabase
      .from('contract_categories')
      .insert({
        contract_id: contractId,
        name: name.trim(),
        order_index: nextOrderIndex,
        updated_by: userId || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      if (error.code === '23505') {
        throw new Error('A category with this name already exists');
      }
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return data;
  }

  /**
   * Rename a category
   */
  async renameCategory(categoryId: string, newName: string, userId?: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const { error } = await supabase
      .from('contract_categories')
      .update({
        name: newName.trim(),
        updated_by: userId || null
      })
      .eq('id', categoryId);

    if (error) {
      console.error('Error renaming category:', error);
      if (error.code === '23505') {
        throw new Error('A category with this name already exists');
      }
      throw new Error(`Failed to rename category: ${error.message}`);
    }
  }

  /**
   * Reorder categories using batch updates
   */
  async reorderCategories(contractId: string, orderedIds: string[], userId?: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Update each category with its new order_index
    // Using a temporary negative offset to avoid unique constraint violations
    const tempOffset = -1000;
    
    // First, set all to temporary negative values
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('contract_categories')
        .update({ order_index: tempOffset - i })
        .eq('id', orderedIds[i])
        .eq('contract_id', contractId);

      if (error) {
        console.error('Error in reorder step 1:', error);
        throw new Error(`Failed to reorder categories: ${error.message}`);
      }
    }

    // Then, set to final positive values
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('contract_categories')
        .update({
          order_index: i,
          updated_by: userId || null
        })
        .eq('id', orderedIds[i])
        .eq('contract_id', contractId);

      if (error) {
        console.error('Error in reorder step 2:', error);
        throw new Error(`Failed to reorder categories: ${error.message}`);
      }
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(categoryId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // First, unassign all clauses from this category
    const { error: unassignError } = await supabase
      .from('contract_items')
      .update({ category_id: null })
      .eq('category_id', categoryId);

    if (unassignError) {
      console.error('Error unassigning clauses:', unassignError);
      throw new Error(`Failed to unassign clauses: ${unassignError.message}`);
    }

    // Then delete the category
    const { error } = await supabase
      .from('contract_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  /**
   * Update clause text (supports multiple fields)
   */
  async updateClauseText(
    itemId: string,
    updates: Partial<{
      clause_text: string;
      clause_title: string;
      clause_number: string;
      general_condition: string;
      particular_condition: string;
    }>
  ): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // First, get the current item_data
    const { data: current, error: fetchError } = await supabase
      .from('contract_items')
      .select('item_data')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('Error fetching clause:', fetchError);
      throw new Error(`Failed to fetch clause: ${fetchError.message}`);
    }

    // Merge updates into item_data
    const updatedItemData = {
      ...current.item_data,
      ...updates
    };

    // Update the clause
    const { error } = await supabase
      .from('contract_items')
      .update({ item_data: updatedItemData })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating clause:', error);
      throw new Error(`Failed to update clause: ${error.message}`);
    }
  }

  /**
   * Move a clause to a different category
   */
  async moveClause(itemId: string, toCategoryId: string | null, toIndex?: number): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Get the current clause to get contract_id
    const { data: clause, error: fetchError } = await supabase
      .from('contract_items')
      .select('contract_id, item_data')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('Error fetching clause:', fetchError);
      throw new Error(`Failed to fetch clause: ${fetchError.message}`);
    }

    // Update the category_id
    const { error } = await supabase
      .from('contract_items')
      .update({
        category_id: toCategoryId,
        item_data: {
          ...clause.item_data,
          category: toCategoryId ? undefined : null // Will be resolved by category name lookup if needed
        }
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error moving clause:', error);
      throw new Error(`Failed to move clause: ${error.message}`);
    }
  }

  /**
   * Reorder clauses within a category
   */
  async reorderClausesInCategory(categoryId: string, orderedIds: string[]): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Update order_index for each clause
    // Note: order_index in contract_items is per (contract_id, section_type), not per category
    // So we need to be careful here - we'll update a custom field in item_data instead
    for (let i = 0; i < orderedIds.length; i++) {
      const { data: clause, error: fetchError } = await supabase
        .from('contract_items')
        .select('item_data')
        .eq('id', orderedIds[i])
        .single();

      if (fetchError) continue;

      const { error } = await supabase
        .from('contract_items')
        .update({
          item_data: {
            ...clause.item_data,
            category_order_index: i
          }
        })
        .eq('id', orderedIds[i]);

      if (error) {
        console.error('Error reordering clause:', error);
      }
    }
  }

  /**
   * Assign a clause to a category (by updating item_data.category and category_id)
   */
  async assignClauseToCategory(itemId: string, categoryId: string, categoryName: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Get current item_data
    const { data: clause, error: fetchError } = await supabase
      .from('contract_items')
      .select('item_data')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('Error fetching clause:', fetchError);
      throw new Error(`Failed to fetch clause: ${fetchError.message}`);
    }

    // Update both category_id and item_data.category
    const { error } = await supabase
      .from('contract_items')
      .update({
        category_id: categoryId,
        item_data: {
          ...clause.item_data,
          category: categoryName
        }
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error assigning clause to category:', error);
      throw new Error(`Failed to assign clause: ${error.message}`);
    }
  }

  /**
   * Remove a clause from its category
   */
  async removeClauseFromCategory(itemId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Get current item_data
    const { data: clause, error: fetchError } = await supabase
      .from('contract_items')
      .select('item_data')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('Error fetching clause:', fetchError);
      throw new Error(`Failed to fetch clause: ${fetchError.message}`);
    }

    // Remove category assignment
    const updatedItemData = { ...clause.item_data };
    delete updatedItemData.category;
    delete updatedItemData.category_order_index;

    const { error } = await supabase
      .from('contract_items')
      .update({
        category_id: null,
        item_data: updatedItemData
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error removing clause from category:', error);
      throw new Error(`Failed to remove clause from category: ${error.message}`);
    }
  }

  /**
   * Delete a clause (soft delete by marking as deleted)
   */
  async deleteClause(itemId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Get current item_data
    const { data: clause, error: fetchError } = await supabase
      .from('contract_items')
      .select('item_data')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('Error fetching clause:', fetchError);
      throw new Error(`Failed to fetch clause: ${fetchError.message}`);
    }

    // Soft delete by marking as deleted
    const { error } = await supabase
      .from('contract_items')
      .update({
        item_data: {
          ...clause.item_data,
          is_deleted: true,
          deleted_at: new Date().toISOString()
        }
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting clause:', error);
      throw new Error(`Failed to delete clause: ${error.message}`);
    }
  }

  /**
   * Hard delete a clause (permanent)
   */
  async hardDeleteClause(itemId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const { error } = await supabase
      .from('contract_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error hard deleting clause:', error);
      throw new Error(`Failed to delete clause: ${error.message}`);
    }
  }

  /**
   * Sync categories from item_data.category to contract_categories table
   * This migrates existing category assignments to the new table structure
   */
  async syncCategoriesFromClauses(contractId: string, userId?: string): Promise<EditorCategory[]> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    // Get all clauses for this contract
    const { data: clauses, error: fetchError } = await supabase
      .from('contract_items')
      .select('id, item_data')
      .eq('contract_id', contractId);

    if (fetchError) {
      throw new Error(`Failed to fetch clauses: ${fetchError.message}`);
    }

    // Extract unique category names from item_data
    const categoryNames = new Set<string>();
    for (const clause of clauses || []) {
      if (clause.item_data?.category) {
        categoryNames.add(clause.item_data.category);
      }
    }

    // Create categories that don't exist yet
    const createdCategories: EditorCategory[] = [];
    let orderIndex = 0;

    for (const name of categoryNames) {
      // Check if category already exists
      const { data: existing } = await supabase
        .from('contract_categories')
        .select('id')
        .eq('contract_id', contractId)
        .eq('name', name)
        .single();

      if (!existing) {
        // Create the category
        const { data: newCategory, error: createError } = await supabase
          .from('contract_categories')
          .insert({
            contract_id: contractId,
            name,
            order_index: orderIndex++,
            updated_by: userId || null
          })
          .select()
          .single();

        if (!createError && newCategory) {
          createdCategories.push(newCategory);
        }
      }
    }

    // Now update all clauses to link to their category_id
    const { data: allCategories } = await supabase
      .from('contract_categories')
      .select('id, name')
      .eq('contract_id', contractId);

    const categoryMap = new Map((allCategories || []).map(c => [c.name, c.id]));

    for (const clause of clauses || []) {
      if (clause.item_data?.category) {
        const categoryId = categoryMap.get(clause.item_data.category);
        if (categoryId) {
          await supabase
            .from('contract_items')
            .update({ category_id: categoryId })
            .eq('id', clause.id);
        }
      }
    }

    return this.fetchCategories(contractId);
  }

  /**
   * Create a new clause using the RPC function
   * This adds the clause at the end of the specified section
   */
  async createClause(params: {
    contractId: string;
    sectionType: 'GENERAL' | 'PARTICULAR';
    categoryId?: string | null;
    clauseNumber?: string;
    clauseTitle?: string;
    clauseText: string;
    conditionType?: 'General' | 'Particular';
  }): Promise<EditorClause> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const {
      contractId,
      sectionType,
      categoryId,
      clauseNumber,
      clauseTitle,
      clauseText,
      conditionType = sectionType === 'GENERAL' ? 'General' : 'Particular'
    } = params;

    // Build item_data object matching existing structure
    const itemData = {
      itemType: 'clause',
      clause_number: clauseNumber || null,
      clause_title: clauseTitle || null,
      clause_text: clauseText,
      general_condition: sectionType === 'GENERAL' ? clauseText : null,
      particular_condition: sectionType === 'PARTICULAR' ? clauseText : null,
      condition_type: conditionType,
      is_deleted: false
    };

    // Call the RPC function to add clause at end
    const { data, error } = await supabase.rpc('add_contract_item_end', {
      p_contract_id: contractId,
      p_section_type: sectionType,
      p_category_id: categoryId || null,
      p_item_data: itemData
    });

    if (error) {
      console.error('Error creating clause:', error);
      if (error.code === '42501' || error.message.includes('permission')) {
        throw new Error('Permission denied. Only admins can create clauses.');
      }
      throw new Error(`Failed to create clause: ${error.message}`);
    }

    return data as EditorClause;
  }

  /**
   * Create a new clause at a specific position
   */
  async createClauseAtPosition(params: {
    contractId: string;
    sectionType: 'GENERAL' | 'PARTICULAR';
    position: number;
    categoryId?: string | null;
    clauseNumber?: string;
    clauseTitle?: string;
    clauseText: string;
    conditionType?: 'General' | 'Particular';
  }): Promise<EditorClause> {
    if (!supabase) {
      throw new Error('Supabase is not initialized');
    }

    const {
      contractId,
      sectionType,
      position,
      categoryId,
      clauseNumber,
      clauseTitle,
      clauseText,
      conditionType = sectionType === 'GENERAL' ? 'General' : 'Particular'
    } = params;

    const itemData = {
      itemType: 'clause',
      clause_number: clauseNumber || null,
      clause_title: clauseTitle || null,
      clause_text: clauseText,
      general_condition: sectionType === 'GENERAL' ? clauseText : null,
      particular_condition: sectionType === 'PARTICULAR' ? clauseText : null,
      condition_type: conditionType,
      is_deleted: false
    };

    const { data, error } = await supabase.rpc('add_contract_item_at_position', {
      p_contract_id: contractId,
      p_section_type: sectionType,
      p_position: position,
      p_category_id: categoryId || null,
      p_item_data: itemData
    });

    if (error) {
      console.error('Error creating clause at position:', error);
      if (error.code === '42501' || error.message.includes('permission')) {
        throw new Error('Permission denied. Only admins can create clauses.');
      }
      throw new Error(`Failed to create clause: ${error.message}`);
    }

    return data as EditorClause;
  }
}

// Export singleton instance
export const adminEditorService = new AdminEditorService();
export default adminEditorService;
