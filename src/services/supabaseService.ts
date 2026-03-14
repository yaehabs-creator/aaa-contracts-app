import { supabase } from '../supabase/config';
import { SavedContract, ContractSection, SectionItem, SectionType, ContractSubfolder, FolderSchemaField, ExtractedData, OrganizerFolderLayout } from '@/types';
import { ensureContractHasSections } from '@/services/contractMigrationService';


/**
 * Recursively removes undefined values from an object.
 * PostgreSQL JSONB doesn't accept undefined values - they must be omitted or set to null.
 * Added a depth limit to prevent infinite loops on circular references.
 */
function removeUndefinedValues(obj: any, depth = 0): any {
  if (depth > 10) return obj; // Prevent infinite recursion

  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item, depth + 1));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value, depth + 1);
      }
    }
    return cleaned;
  }

  return obj;
}



/**
 * Load contract from relational tables (subcollections)
 */
async function loadContractFromSubcollections(contractId: string, contractMetadata: any): Promise<SavedContract> {
  if (!supabase) {
    throw new Error('Supabase is not initialized.');
  }

  const sections: ContractSection[] = [];

  // Load all sections for this contract
  const { data: sectionsData, error: sectionsError } = await supabase
    .from('contract_sections')
    .select('*')
    .eq('contract_id', contractId)
    .order('section_type');

  if (sectionsError) {
    throw new Error(`Failed to load sections: ${sectionsError.message}`);
  }

  // Load items for each section
  // Load items for each section
  for (const sectionRow of sectionsData || []) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('contract_items')
      .select('item_data, gc_link_tokens, pc_link_tokens')
      .eq('contract_id', contractId)
      .eq('section_type', sectionRow.section_type)
      .order('order_index');

    if (itemsError) {
      console.error(`Failed to load items for section ${sectionRow.section_type}:`, itemsError);
      continue;
    }

    const items: SectionItem[] = (itemsData || [])
      .map(row => {
        const item = removeUndefinedValues(row.item_data) as SectionItem;
        // Merge tokens if they exist
        if (row.gc_link_tokens) item.gc_link_tokens = row.gc_link_tokens;
        if (row.pc_link_tokens) item.pc_link_tokens = row.pc_link_tokens;
        return item;
      })
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    sections.push({
      sectionType: sectionRow.section_type as SectionType,
      title: sectionRow.title,
      items
    });
  }

  // Ensure all 4 sections exist
  const contract: SavedContract = {
    ...contractMetadata,
    id: contractId,
    timestamp: contractMetadata.timestamp || Date.now(),
    sections
  };

  return ensureContractHasSections(contract);
}

export const saveContractToSupabase = async (contract: SavedContract): Promise<SavedContract> => {
  try {
    console.log('[SUPABASE] Entering saveContractToSupabase...');
    if (!supabase) {
      throw new Error('Supabase is not initialized. Please check your Supabase configuration.');
    }

    // Verify authentication before attempting to save
    console.log('[SUPABASE] Checking auth session...');
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Auth session error:', authError);
      throw new Error('Authentication error. Please log in again.');
    }
    if (!session || !session.user) {
      console.error('No active session found');
      throw new Error('You are not authenticated. Please log in and try again.');
    }
    console.log('[SUPABASE] Authenticated user:', session.user.id, session.user.email);

    // Ensure contract has sections (migrate if needed), but preserve existing sections
    let migratedContract: SavedContract;

    if (contract.sections && contract.sections.length > 0) {
      migratedContract = ensureContractHasSections(contract);
    } else {
      migratedContract = ensureContractHasSections(contract);
    }

    // Log what we're saving for debugging
    console.log('Saving contract to Supabase:', {
      id: migratedContract.id,
      name: migratedContract.name,
      hasSections: !!migratedContract.sections,
      sectionsCount: migratedContract.sections?.length || 0,
      agreementItems: migratedContract.sections?.find(s => s.sectionType === 'AGREEMENT')?.items.length || 0,
      loaItems: migratedContract.sections?.find(s => s.sectionType === 'LOA')?.items.length || 0,
      generalItems: migratedContract.sections?.find(s => s.sectionType === 'GENERAL')?.items.length || 0,
      particularItems: migratedContract.sections?.find(s => s.sectionType === 'PARTICULAR')?.items.length || 0
    });

    // Prepare contract data (remove undefined values)
    const contractData = removeUndefinedValues({
      id: migratedContract.id,
      name: migratedContract.name,
      title: migratedContract.title || migratedContract.name,
      project_id: migratedContract.project_id,
      contractor_id: migratedContract.contractor_id,
      contractor_name: migratedContract.contractor_name,
      contract_number: migratedContract.contract_number,
      status: migratedContract.status || 'draft',
      ingestion_progress: migratedContract.ingestion_progress || {
          expected_sections: ["AGREEMENT", "PARTICULAR_CONDITIONS", "GENERAL_CONDITIONS"],
          completed_sections: [],
          errors: []
      },
      start_date: migratedContract.start_date,
      end_date: migratedContract.end_date,
      currency: migratedContract.currency,
      value: migratedContract.value,
      scope_text: migratedContract.scope_text,
      timestamp: migratedContract.timestamp,
      metadata: migratedContract.metadata,
      sections: migratedContract.sections || []
    });

    console.log('Saving contract via atomic RPC v2:', migratedContract.id, 'Expected Version:', migratedContract.version);

    // Call the atomic RPC function v2 with optimistic concurrency
    const { data: rpcData, error: rpcError } = await supabase.rpc('save_contract_v2', {
      p_contract_data: contractData,
      p_expected_version: migratedContract.version
    });

    if (rpcError) {
      console.error('Supabase RPC error:', rpcError);
      throw rpcError;
    }

    if (rpcData?.status === 'conflict') {
      const error = new Error('Conflict: The contract has been modified by another user.') as any;
      error.code = '409';
      error.currentServerVersion = rpcData.current_version;
      throw error;
    }

    console.log('Contract saved successfully via RPC v2:', rpcData);

    // Update the contract object with the new version from server
    if (rpcData?.version) {
      migratedContract.version = rpcData.version;
    }

    return migratedContract;

  } catch (error: any) {
    console.error('Error saving contract:', error);
    console.error('Full error details:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      name: error?.name
    });

    // Extract Supabase error details
    const errorCode = error?.code || 'unknown';
    const errorMessage = error?.message || String(error);
    const errorDetails = error?.details || '';
    const errorHint = error?.hint || '';

    // Provide more specific error messages
    let userMessage = 'Failed to save contract to server';

    // Check for RLS/permission errors
    if (errorCode === '42501' || errorCode === 'PGRST301' ||
      errorMessage.includes('permission denied') ||
      errorMessage.includes('row-level security') ||
      errorMessage.includes('new row violates row-level security')) {
      userMessage = 'Permission denied. Please ensure you are logged in and have permission to save contracts. Check browser console for details.';
      console.error('RLS Policy Error - User may not be authenticated or RLS policies may be blocking the operation');
    } else if (errorCode === 'PGRST116') {
      userMessage = 'Contract not found. This may be a permissions issue.';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (errorMessage.includes('JWT') || errorMessage.includes('authentication') || errorMessage.includes('not authenticated')) {
      userMessage = 'You are not authenticated. Please log in and try again.';
    } else if (errorDetails || errorHint) {
      userMessage = `Failed to save contract: ${errorMessage}. ${errorDetails ? `Details: ${errorDetails}` : ''} ${errorHint ? `Hint: ${errorHint}` : ''}`;
    } else {
      userMessage = `Failed to save contract: ${errorMessage}`;
    }

    throw new Error(userMessage);
  }
};

export const getAllContractsFromSupabase = async (options: { metadataOnly?: boolean } = {}): Promise<SavedContract[]> => {
  try {

    if (!supabase) {
      console.warn('Supabase not initialized, returning empty array');
      return [];
    }

    // Check authentication before querying
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (!session || !session.user) {
      console.warn('No active session when fetching contracts');
      return [];
    }

    // Fetch all contracts ordered by timestamp
    // RLS policies will handle authentication checks
    console.log('Fetching contracts from Supabase...');
    const { data: contractsData, error } = await supabase
      .from('contracts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching contracts:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });

      // Log the full error for debugging
      console.error('Full error object:', error);

      // If permission denied or not found, return empty array
      if (error.code === 'PGRST116' || error.code === '42501' ||
        error.message?.includes('permission denied') ||
        error.message?.includes('row-level security')) {
        console.warn('Permission denied when fetching contracts - check RLS policies and authentication');
        return [];
      }
      throw new Error(`Failed to fetch contracts from server: ${error.message}`);
    }

    console.log(`Successfully fetched ${contractsData?.length || 0} contracts from database`);

    // If only metadata is requested, return the raw metadata without loading subcollections/sections
    if (options.metadataOnly) {
      return (contractsData || []).map(row => ({
        id: row.id,
        name: row.name,
        title: row.title || row.name,
        project_id: row.project_id,
        contractor_id: row.contractor_id,
        contract_number: row.contract_number,
        status: (row.status || 'draft') as any,
        ingestion_progress: row.ingestion_progress,
        start_date: row.start_date,
        end_date: row.end_date,
        currency: row.currency,
        value: row.value,
        scope_text: row.scope_text,
        timestamp: row.timestamp,
        metadata: row.metadata,
        clauses: null,
        sections: null,
        uses_subcollections: row.uses_subcollections,
        version: row.version || 1,
        is_deleted: row.is_deleted || false,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by
      } as SavedContract));
    }

    // Load full contract data (including subcollections if needed)
    const contracts = await Promise.all(
      (contractsData || []).map(async (row) => {
        try {
          // If contract uses subcollections, load full data
          if (row.uses_subcollections) {
            return await loadContractFromSubcollections(row.id, row);
          }

          // Single document format
          const contract: SavedContract = {
            id: row.id,
            name: row.name,
            title: row.title || row.name,
            project_id: row.project_id,
            contractor_id: row.contractor_id,
            contract_number: row.contract_number,
            status: (row.status || 'draft') as any,
            ingestion_progress: row.ingestion_progress,
            start_date: row.start_date,
            end_date: row.end_date,
            currency: row.currency,
            value: row.value,
            scope_text: row.scope_text,
            timestamp: row.timestamp,
            metadata: row.metadata,
            clauses: row.clauses || null,
            sections: row.sections || null,
            version: row.version || 1,
            is_deleted: row.is_deleted || false,
            created_at: row.created_at,
            updated_at: row.updated_at,
            created_by: row.created_by
          };

          // Auto-migrate on load
          return ensureContractHasSections(contract);
        } catch (err) {
          console.error(`Error loading contract ${row.id}:`, err);
          // Return a basic contract object even if loading fails
          return {
            id: row.id,
            name: row.name,
            timestamp: row.timestamp,
            metadata: row.metadata,
            clauses: null,
            sections: null
          } as SavedContract;
        }
      })
    );

    return contracts;
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    if (error.message?.includes('permission denied')) {
      return [];
    }
    throw new Error('Failed to fetch contracts from server');
  }
};

export const getContractFromSupabase = async (id: string): Promise<SavedContract | null> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    // Fetch contract
    const { data: contractData, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    if (!contractData) {
      return null;
    }

    // Check if contract uses subcollections
    if (contractData.uses_subcollections) {
      return await loadContractFromSubcollections(id, contractData);
    }

    // Single document format
    const contract: SavedContract = {
      id: contractData.id,
      name: contractData.name,
      title: contractData.title || contractData.name,
      project_id: contractData.project_id,
      contractor_id: contractData.contractor_id,
      contract_number: contractData.contract_number,
      status: (contractData.status || 'draft') as any,
      ingestion_progress: contractData.ingestion_progress,
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      currency: contractData.currency,
      value: contractData.value,
      scope_text: contractData.scope_text,
      timestamp: contractData.timestamp,
      metadata: contractData.metadata,
      clauses: contractData.clauses || null,
      sections: contractData.sections || null,
      version: contractData.version || 1,
      is_deleted: contractData.is_deleted || false,
      created_at: contractData.created_at,
      updated_at: contractData.updated_at,
      created_by: contractData.created_by
    };

    // Load clauses if ready
    if (contract.status === 'ready') {
        const { data: ingestionClauses } = await supabase
            .from('ingestion_clauses')
            .select('*')
            .eq('contract_id', id)
            .order('clause_number');
        
        if (ingestionClauses && ingestionClauses.length > 0) {
            // Map new clauses to legacy format for UI compatibility
            contract.clauses = ingestionClauses.map(ic => ({
                clause_number: ic.clause_number,
                clause_title: ic.title,
                clause_text: ic.content,
                condition_type: ic.section_key === 'GENERAL_CONDITIONS' ? 'General' : 'Particular',
                comparison: [],
                category: ''
            }));
        }
    }

    // Log what we're loading
    console.log('Loading contract from Supabase:', {
      id: contract.id,
      name: contract.name,
      hasSections: !!contract.sections,
      sectionsCount: contract.sections?.length || 0,
      hasClauses: !!contract.clauses,
      clausesCount: contract.clauses?.length || 0,
      agreementItems: contract.sections?.find(s => s.sectionType === 'AGREEMENT')?.items.length || 0,
      loaItems: contract.sections?.find(s => s.sectionType === 'LOA')?.items.length || 0
    });

    // Auto-migrate on load
    const migratedContract = ensureContractHasSections(contract);

    // Log after migration
    console.log('After migration:', {
      id: migratedContract.id,
      sectionsCount: migratedContract.sections?.length || 0,
      agreementItems: migratedContract.sections?.find(s => s.sectionType === 'AGREEMENT')?.items.length || 0,
      loaItems: migratedContract.sections?.find(s => s.sectionType === 'LOA')?.items.length || 0
    });

    return migratedContract;
  } catch (error) {
    console.error('Error fetching contract:', error);
    throw new Error('Failed to fetch contract from server');
  }
};

export const deleteContractFromSupabase = async (id: string): Promise<void> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    // Check if contract uses subcollections
    const { data: contractData } = await supabase
      .from('contracts')
      .select('uses_subcollections')
      .eq('id', id)
      .single();

    if (contractData?.uses_subcollections) {
      // Delete items and sections (CASCADE will handle this, but we can be explicit)
      await supabase
        .from('contract_items')
        .delete()
        .eq('contract_id', id);

      await supabase
        .from('contract_sections')
        .delete()
        .eq('contract_id', id);
    }

    // Delete main contract document (CASCADE will delete related records)
    const { error } = await supabase
      .from('contracts')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting contract:', error);
    throw new Error('Failed to delete contract from server');
  }
};

// ============================================
// App Settings Functions
// ============================================

/**
 * Get whether login is required
 * Returns true by default if setting doesn't exist
 */
export const getLoginRequired = async (): Promise<boolean> => {
  try {
    if (!supabase) {
      console.warn('Supabase not initialized, defaulting to login required');
      return true;
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'login_required')
      .single();

    if (error) {
      // If table doesn't exist or setting not found, default to true
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.warn('app_settings table or login_required setting not found, defaulting to true');
        return true;
      }
      console.error('Error fetching login_required setting:', error);
      return true; // Default to requiring login on error
    }

    // The value is stored as JSONB, so it could be true, false, "true", or "false"
    const value = data?.value;
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value === 'true';
    }
    return true; // Default
  } catch (error) {
    console.error('Error getting login_required setting:', error);
    return true; // Default to requiring login on error
  }
};

/**
 * Set whether login is required (admin only)
 */
export const setLoginRequired = async (required: boolean): Promise<void> => {
  try {
    if (!supabase) {
      throw new Error('Supabase is not initialized.');
    }

    // Verify user is authenticated and is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('You must be logged in to change settings.');
    }

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'login_required',
        value: required,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      }, {
        onConflict: 'key'
      });

    if (error) {
      console.error('Error updating login_required setting:', error);
      if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error('Permission denied. Only admins can change this setting.');
      }
      throw new Error(`Failed to update setting: ${error.message}`);
    }

    console.log(`Login requirement set to: ${required}`);
  } catch (error: any) {
    console.error('Error setting login_required:', error);
    throw error;
  }
};

// Activity logging (optional but useful for audit trails)
export const logActivity = async (
  action: string,
  contractId: string,
  userId: string,
  details?: any
): Promise<void> => {
  try {
    if (!supabase) {
      console.warn('Supabase not initialized, skipping activity log');
      return;
    }

    const { error } = await supabase
      .from('activity_logs')
      .insert({
        action,
        contract_id: contractId || null,
        user_id: userId || null,
        details: details || null
      });

    if (error) {
      console.error('Error logging activity:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging failures shouldn't break the app
  }
};

// ============================================
// Category Functions (for Admin Editor integration)
// ============================================

export interface ContractCategory {
  id: string;
  contract_id: string;
  name: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all categories for a contract (ordered by order_index)
 */
export const getCategoriesForContract = async (contractId: string): Promise<ContractCategory[]> => {
  try {
    if (!supabase) {
      console.warn('Supabase not initialized');
      return [];
    }

    const { data, error } = await supabase
      .from('contract_categories')
      .select('*')
      .eq('contract_id', contractId)
      .order('order_index', { ascending: true });

    if (error) {
      // Table might not exist yet
      if (error.code === '42P01') {
        console.warn('contract_categories table does not exist');
        return [];
      }
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/**
 * Fetch clauses with their category assignments for a contract
 * Returns a map of clause_id -> category_id
 */
export const getClauseCategoryAssignments = async (contractId: string): Promise<Map<string, string>> => {
  try {
    if (!supabase) {
      return new Map();
    }

    const { data, error } = await supabase
      .from('contract_items')
      .select('id, category_id')
      .eq('contract_id', contractId)
      .not('category_id', 'is', null);

    if (error) {
      console.error('Error fetching clause category assignments:', error);
      return new Map();
    }

    const assignments = new Map<string, string>();
    (data || []).forEach(item => {
      if (item.category_id) {
        assignments.set(item.id, item.category_id);
      }
    });

    return assignments;
  } catch (error) {
    console.error('Error fetching clause category assignments:', error);
    return new Map();
  }
};
// ============================================
// Contract Organizer Persistence
// ============================================

const DEFAULT_TEMPLATE_ID = '7f23c9a0-1234-4567-890a-bcdef1234567';

export const getOrganizerData = async (contractId: string) => {
  if (!supabase) throw new Error('Supabase not initialized');

  // Load subfolders for the default template
  const { data: subfolders, error: subError } = await supabase
    .from('contract_subfolders')
    .select('*')
    .eq('template_id', DEFAULT_TEMPLATE_ID)
    .order('order_index');

  if (subError) throw subError;

  // Load schemas for those subfolders
  const subfolderIds = subfolders?.map(s => s.id) || [];
  let schemasData: any[] = [];

  if (subfolderIds.length > 0) {
    const { data: schemas, error: schemaError } = await supabase
      .from('contract_folder_schema')
      .select('*')
      .in('subfolder_id', subfolderIds);
    if (schemaError) throw schemaError;
    schemasData = schemas || [];
  }

  // Load extracted data for this contract
  const { data: extracted, error: extError } = await supabase
    .from('contract_extracted_data')
    .select('*')
    .eq('contract_id', contractId);

  if (extError) throw extError;

  return {
    subfolders: (subfolders || []) as ContractSubfolder[],
    schemas: schemasData as FolderSchemaField[],
    extractedData: (extracted || []) as ExtractedData[]
  };
};

export const saveOrganizerData = async (contractId: string, data: {
  subfolders: ContractSubfolder[],
  schemas: Record<string, FolderSchemaField[]>,
  extractedData: ExtractedData[]
}) => {
  if (!supabase) throw new Error('Supabase not initialized');

  console.log('Synchronizing organizer data for contract:', contractId);

  // 1. Sync Subfolders (Upsert current, delete stale)
  if (data.subfolders.length > 0) {
    const currentSubfolderIds = data.subfolders.map(s => s.id);

    // Delete subfolders that belong to this template but are NOT in the current list
    // Note: We use the default template ID as per current architecture
    const { error: delSubError } = await supabase
      .from('contract_subfolders')
      .delete()
      .eq('template_id', DEFAULT_TEMPLATE_ID)
      .not('id', 'in', `(${currentSubfolderIds.join(',')})`);

    if (delSubError) console.error('Error deleting stale subfolders:', delSubError);

    const { error: subError } = await supabase
      .from('contract_subfolders')
      .upsert(data.subfolders.map(s => ({
        id: s.id,
        template_id: DEFAULT_TEMPLATE_ID,
        folder_code: s.folder_code,
        name: s.name,
        order_index: s.order_index
      })));
    if (subError) throw new Error(`Failed to save subfolders: ${subError.message}`);
  }

  // 2. Sync Schemas
  const allFields: any[] = [];
  const currentSubfolderIds = data.subfolders.map(s => s.id);

  // Filter schemas to only include those for subfolders we are currently saving
  // This prevents FK violations if stale schemas exist in the UI state
  Object.entries(data.schemas).forEach(([subfolderId, fields]) => {
    if (currentSubfolderIds.includes(subfolderId)) {
      allFields.push(...fields);
    } else {
      console.warn(`saveOrganizerData: Skipping schema for subfolder ${subfolderId} as it's not in the active list`);
    }
  });

  if (allFields.length > 0) {
    const currentFieldIds = allFields.map(f => f.id);

    // Delete fields that are NOT in the current list but belong to our active subfolders
    const { error: delSchemaError } = await supabase
      .from('contract_folder_schema')
      .delete()
      .in('subfolder_id', currentSubfolderIds)
      .not('id', 'in', `(${currentFieldIds.join(',')})`);

    if (delSchemaError) console.error('Error deleting stale schema fields:', delSchemaError);

    const { error: schemaError } = await supabase
      .from('contract_folder_schema')
      .upsert(allFields.map(f => ({
        id: f.id,
        subfolder_id: f.subfolder_id,
        key: f.key,
        label: f.label,
        type: f.type,
        required: f.required,
        allowed_values: f.allowed_values,
        help_text: f.help_text
      })));
    if (schemaError) throw schemaError;
  }

  // 3. Sync Extracted Data
  if (data.extractedData.length > 0) {
    const currentExtractedIds = data.extractedData.map(ed => ed.id);

    // Delete extracted data for this contract that is NOT in the current list
    const { error: delExtError } = await supabase
      .from('contract_extracted_data')
      .delete()
      .eq('contract_id', contractId)
      .not('id', 'in', `(${currentExtractedIds.join(',')})`);

    if (delExtError) console.error('Error deleting stale extracted data:', delExtError);

    const { error: extError } = await supabase
      .from('contract_extracted_data')
      .upsert(data.extractedData.map(ed => ({
        id: ed.id,
        contract_id: contractId,
        doc_id: ed.doc_id,
        subfolder_id: ed.subfolder_id,
        field_key: ed.field_key,
        value: ed.value,
        confidence: ed.confidence,
        evidence: ed.evidence,
        status: ed.status,
        doc_url: ed.doc_url,
        doc_name: ed.doc_name,
        updated_at: new Date().toISOString()
      })));

    if (extError) throw new Error(`Failed to save extracted data: ${extError.message}`);
  } else {
    // If we have NO extracted data in the UI, but it exists in DB, wipe it for this contract
    const { error: clearError } = await supabase
      .from('contract_extracted_data')
      .delete()
      .eq('contract_id', contractId);
    if (clearError) console.error('Error clearing extracted data:', clearError);
  }
};

export const getOrganizerLayout = async (contractId: string): Promise<OrganizerFolderLayout[]> => {
  if (!supabase) throw new Error('Supabase not initialized');

  try {
    const { data, error } = await supabase
      .from('organizer_layouts')
      .select('layout')
      .eq('contract_id', contractId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - returning default layout (internal handled by hook/caller if needed, 
        // but here we return empty array so hook knows to use defaults)
        return [];
      }
      console.warn('getOrganizerLayout error:', error);
      return [];
    }

    return (data.layout || []) as OrganizerFolderLayout[];
  } catch (err) {
    console.error('Failed to fetch organizer layout:', err);
    return [];
  }
};

export const saveOrganizerLayout = async (contractId: string, layout: OrganizerFolderLayout[]) => {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) throw new Error('User must be logged in to save layout');

  const { error } = await supabase
    .from('organizer_layouts')
    .upsert({
      contract_id: contractId,
      created_by: userId,
      layout,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'contract_id'
    });

  if (error) {
    console.error('saveOrganizerLayout error:', error);
    throw new Error(`Failed to save layout: ${error.message}`);
  }
};

// ============================================
// Supabase Storage - Document Management
// ============================================

const STORAGE_BUCKET = 'contract-docs';

/**
 * Upload a document to Supabase Storage
 */
export const uploadContractDocument = async (file: File, path: string): Promise<string> => {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    // If bucket doesn't exist, this might fail. In a real app we'd ensure it exists.
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload document: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path);

  return publicUrl;
};

/**
 * Get a public URL for a document
 */
export const getDocumentUrl = (path: string): string => {
  if (!supabase) throw new Error('Supabase not initialized');

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  return publicUrl;
};
