import { Clause, Category, CategoryAction } from '../types';

export interface CategoryManagerResult {
  success: boolean;
  message?: string;
  categories?: Category[];
  clauses?: Clause[];
  error?: string;
}

/**
 * Category Manager Engine
 * Follows user instructions exactly - never auto-generates or modifies categories
 */
export class CategoryManagerService {
  private categories: Map<string, Category> = new Map();
  private clauses: Clause[] = [];

  /**
   * Initialize with existing clauses
   */
  initialize(clauses: Clause[]): void {
    this.clauses = clauses;
    this.categories.clear();
    
    // Build categories from clauses that have category assigned
    clauses.forEach(clause => {
      if (clause.category) {
        if (!this.categories.has(clause.category)) {
          this.categories.set(clause.category, {
            name: clause.category,
            clauseNumbers: []
          });
        }
        const category = this.categories.get(clause.category)!;
        if (!category.clauseNumbers.includes(clause.clause_number)) {
          category.clauseNumbers.push(clause.clause_number);
        }
      }
    });
  }

  /**
   * Process a category action and return JSON result
   */
  processAction(action: CategoryAction): CategoryManagerResult {
    try {
      switch (action.action) {
        case 'create_category':
          return this.createCategory(action.category_name);
        
        case 'rename_category':
          return this.renameCategory(action.old_name, action.new_name);
        
        case 'delete_category':
          return this.deleteCategory(action.category_name);
        
        case 'add_clause':
          return this.addClauseToCategory(action.clause_number, action.category_name);
        
        case 'remove_clause':
          return this.removeClauseFromCategory(action.clause_number, action.category_name);
        
        case 'show_category':
          return this.showCategory(action.category_name);
        
        default:
          return {
            success: false,
            error: 'Unknown action'
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Action failed'
      };
    }
  }

  /**
   * Get updated clauses after category operations
   */
  getUpdatedClauses(): Clause[] {
    return this.clauses;
  }

  /**
   * Get all categories
   */
  getAllCategories(): Category[] {
    return Array.from(this.categories.values());
  }

  private createCategory(categoryName: string): CategoryManagerResult {
    if (!categoryName || !categoryName.trim()) {
      return {
        success: false,
        error: 'Category name cannot be empty'
      };
    }

    const trimmedName = categoryName.trim();
    
    if (this.categories.has(trimmedName)) {
      return {
        success: false,
        error: `Category "${trimmedName}" already exists`
      };
    }

    this.categories.set(trimmedName, {
      name: trimmedName,
      clauseNumbers: []
    });

    return {
      success: true,
      message: `Category "${trimmedName}" created successfully`,
      categories: Array.from(this.categories.values())
    };
  }

  private renameCategory(oldName: string, newName: string): CategoryManagerResult {
    if (!oldName || !oldName.trim()) {
      return {
        success: false,
        error: 'Old category name cannot be empty'
      };
    }

    if (!newName || !newName.trim()) {
      return {
        success: false,
        error: 'New category name cannot be empty'
      };
    }

    const trimmedOldName = oldName.trim();
    const trimmedNewName = newName.trim();

    if (!this.categories.has(trimmedOldName)) {
      return {
        success: false,
        error: `Category "${trimmedOldName}" does not exist`
      };
    }

    if (this.categories.has(trimmedNewName) && trimmedOldName !== trimmedNewName) {
      return {
        success: false,
        error: `Category "${trimmedNewName}" already exists`
      };
    }

    const category = this.categories.get(trimmedOldName)!;
    category.name = trimmedNewName;
    
    // Update clause references
    this.clauses.forEach(clause => {
      if (clause.category === trimmedOldName) {
        clause.category = trimmedNewName;
      }
    });

    // Update map
    this.categories.delete(trimmedOldName);
    this.categories.set(trimmedNewName, category);

    return {
      success: true,
      message: `Category renamed from "${trimmedOldName}" to "${trimmedNewName}"`,
      categories: Array.from(this.categories.values())
    };
  }

  private deleteCategory(categoryName: string): CategoryManagerResult {
    if (!categoryName || !categoryName.trim()) {
      return {
        success: false,
        error: 'Category name cannot be empty'
      };
    }

    const trimmedName = categoryName.trim();

    if (!this.categories.has(trimmedName)) {
      return {
        success: false,
        error: `Category "${trimmedName}" does not exist`
      };
    }

    // Remove category from all clauses
    this.clauses.forEach(clause => {
      if (clause.category === trimmedName) {
        delete clause.category;
      }
    });

    this.categories.delete(trimmedName);

    return {
      success: true,
      message: `Category "${trimmedName}" deleted successfully`,
      categories: Array.from(this.categories.values())
    };
  }

  private addClauseToCategory(clauseNumber: string, categoryName: string): CategoryManagerResult {
    if (!clauseNumber || !clauseNumber.trim()) {
      return {
        success: false,
        error: 'Clause number cannot be empty'
      };
    }

    if (!categoryName || !categoryName.trim()) {
      return {
        success: false,
        error: 'Category name cannot be empty'
      };
    }

    const trimmedCategoryName = categoryName.trim();
    const trimmedClauseNumber = clauseNumber.trim();

    // Ensure category exists
    if (!this.categories.has(trimmedCategoryName)) {
      this.categories.set(trimmedCategoryName, {
        name: trimmedCategoryName,
        clauseNumbers: []
      });
    }

    const clause = this.clauses.find(c => c.clause_number.trim() === trimmedClauseNumber);
    
    if (!clause) {
      return {
        success: false,
        error: `Clause "${trimmedClauseNumber}" not found`
      };
    }

    // Add category to clause
    clause.category = trimmedCategoryName;

    // Update category's clause list
    const category = this.categories.get(trimmedCategoryName)!;
    if (!category.clauseNumbers.includes(trimmedClauseNumber)) {
      category.clauseNumbers.push(trimmedClauseNumber);
    }

    return {
      success: true,
      message: `Clause "${trimmedClauseNumber}" added to category "${trimmedCategoryName}"`,
      categories: Array.from(this.categories.values())
    };
  }

  private removeClauseFromCategory(clauseNumber: string, categoryName: string): CategoryManagerResult {
    if (!clauseNumber || !clauseNumber.trim()) {
      return {
        success: false,
        error: 'Clause number cannot be empty'
      };
    }

    if (!categoryName || !categoryName.trim()) {
      return {
        success: false,
        error: 'Category name cannot be empty'
      };
    }

    const trimmedCategoryName = categoryName.trim();
    const trimmedClauseNumber = clauseNumber.trim();

    if (!this.categories.has(trimmedCategoryName)) {
      return {
        success: false,
        error: `Category "${trimmedCategoryName}" does not exist`
      };
    }

    const clause = this.clauses.find(c => c.clause_number.trim() === trimmedClauseNumber);
    
    if (!clause) {
      return {
        success: false,
        error: `Clause "${trimmedClauseNumber}" not found`
      };
    }

    if (clause.category !== trimmedCategoryName) {
      return {
        success: false,
        error: `Clause "${trimmedClauseNumber}" is not in category "${trimmedCategoryName}"`
      };
    }

    // Remove category from clause
    delete clause.category;

    // Update category's clause list
    const category = this.categories.get(trimmedCategoryName)!;
    category.clauseNumbers = category.clauseNumbers.filter(num => num !== trimmedClauseNumber);

    // If category is now empty, optionally delete it (or keep it)
    // Keeping it for now as per user instructions - only delete when explicitly requested

    return {
      success: true,
      message: `Clause "${trimmedClauseNumber}" removed from category "${trimmedCategoryName}"`,
      categories: Array.from(this.categories.values())
    };
  }

  private showCategory(categoryName: string): CategoryManagerResult {
    if (!categoryName || !categoryName.trim()) {
      return {
        success: false,
        error: 'Category name cannot be empty'
      };
    }

    const trimmedName = categoryName.trim();

    if (!this.categories.has(trimmedName)) {
      return {
        success: false,
        error: `Category "${trimmedName}" does not exist`
      };
    }

    const category = this.categories.get(trimmedName)!;
    const categoryClauses = this.clauses.filter(
      c => c.category === trimmedName
    );

    return {
      success: true,
      message: `Category "${trimmedName}" contains ${categoryClauses.length} clause(s)`,
      clauses: categoryClauses,
      categories: [category]
    };
  }
}
