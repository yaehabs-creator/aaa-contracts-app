
/**
 * Supabase Service — Real Supabase Integration
 * Handles all Supabase operations for contracts, organizer data, and file uploads.
 */

import { supabase } from '@/lib/supabase';
import {
  SavedContract,
  ExtractedData,
  ContractSubfolder,
  FolderSchemaField,
  OrganizerFolderLayout,
} from '@/types';

// Re-export supabase client for backward compatibility
export { supabase };

// ==========================================
// CONTRACT OPERATIONS
// ==========================================

export const saveContractToSupabase = async (contract: SavedContract): Promise<SavedContract> => {
  const { data, error } = await supabase
    .from('contracts')
    .upsert({
      id: contract.id,
      name: contract.name,
      title: contract.title || contract.name,
      project_id: contract.project_id,
      contractor_id: contract.contractor_id,
      contractor_name: contract.contractor_name,
      contract_number: contract.contract_number,
      status: contract.status || 'draft',
      start_date: contract.start_date,
      end_date: contract.end_date,
      currency: contract.currency,
      value: contract.value,
      scope_text: contract.scope_text,
      metadata: contract.metadata,
      sections: contract.sections,
      ingestion_progress: contract.ingestion_progress,
      version: contract.version || 1,
      is_deleted: contract.is_deleted || false,
      created_by: contract.created_by,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('saveContractToSupabase error:', error);
    throw error;
  }

  return { ...contract, ...data };
};

export const getAllContractsFromSupabase = async (): Promise<SavedContract[]> => {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAllContractsFromSupabase error:', error);
    return [];
  }

  return (data || []).map(mapContractFromDB);
};

export const getContractFromSupabase = async (id: string): Promise<SavedContract | null> => {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('getContractFromSupabase error:', error);
    return null;
  }

  return data ? mapContractFromDB(data) : null;
};

export const deleteContractFromSupabase = async (id: string): Promise<void> => {
  // Soft delete
  const { error } = await supabase
    .from('contracts')
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) {
    console.error('deleteContractFromSupabase error:', error);
    throw error;
  }
};

// Map DB row to SavedContract
function mapContractFromDB(row: any): SavedContract {
  return {
    id: row.id,
    name: row.name,
    title: row.title || row.name,
    project_id: row.project_id,
    contractor_id: row.contractor_id,
    contractor_name: row.contractor_name,
    contract_number: row.contract_number,
    status: row.status || 'draft',
    start_date: row.start_date,
    end_date: row.end_date,
    currency: row.currency,
    value: row.value,
    scope_text: row.scope_text,
    timestamp: new Date(row.updated_at || row.created_at).getTime(),
    sections: row.sections,
    metadata: row.metadata || {
      totalClauses: 0,
      generalCount: 0,
      particularCount: 0,
      highRiskCount: 0,
      conflictCount: 0,
    },
    ingestion_progress: row.ingestion_progress,
    version: row.version || 1,
    is_deleted: row.is_deleted,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ==========================================
// AUTH & SETTINGS
// ==========================================

export const getLoginRequired = async (): Promise<boolean> => true;
export const setLoginRequired = async (_required: boolean): Promise<void> => {};

// ==========================================
// ACTIVITY LOG
// ==========================================

export const logActivity = async (
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('activity_log').insert({
      user_id: user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
    });
  } catch (err) {
    console.warn('Activity log failed:', err);
  }
};

// ==========================================
// CATEGORIES (stored in clauses table)
// ==========================================

export const getCategoriesForContract = async (contractId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('clauses')
    .select('category')
    .eq('contract_id', contractId)
    .not('category', 'is', null);

  if (error) return [];
  const unique = [...new Set((data || []).map(d => d.category).filter(Boolean))];
  return unique as string[];
};

export const getClauseCategoryAssignments = async (contractId: string): Promise<Map<string, string>> => {
  const { data, error } = await supabase
    .from('clauses')
    .select('clause_number, category')
    .eq('contract_id', contractId)
    .not('category', 'is', null);

  if (error) return new Map();
  const map = new Map<string, string>();
  (data || []).forEach(d => {
    if (d.category) map.set(d.clause_number, d.category);
  });
  return map;
};

// ==========================================
// ORGANIZER DATA
// ==========================================

export const getOrganizerData = async (contractId: string) => {
  const { data, error } = await supabase
    .from('organizer_layouts')
    .select('*')
    .eq('contract_id', contractId)
    .single();

  if (error || !data) {
    return { subfolders: [], schemas: {}, extractedData: [] };
  }

  // Also fetch extracted data
  const { data: extractedRows } = await supabase
    .from('extracted_data')
    .select('*')
    .eq('contract_id', contractId);

  return {
    subfolders: data.subfolders || [],
    schemas: data.schemas || {},
    extractedData: (extractedRows || []).map(mapExtractedData),
  };
};

export const saveOrganizerData = async (
  contractId: string,
  payload: { subfolders?: any; schemas?: any; extractedData?: ExtractedData[] }
): Promise<void> => {
  // Upsert layout
  await supabase
    .from('organizer_layouts')
    .upsert({
      contract_id: contractId,
      subfolders: payload.subfolders || [],
      schemas: payload.schemas || {},
    }, { onConflict: 'contract_id' });

  // Save extracted data
  if (payload.extractedData && payload.extractedData.length > 0) {
    for (const item of payload.extractedData) {
      await supabase.from('extracted_data').upsert({
        id: item.id,
        contract_id: contractId,
        subfolder_id: item.subfolder_id,
        field_key: item.field_key,
        value: item.value,
        confidence: item.confidence,
        evidence: item.evidence,
        status: item.status,
        doc_url: item.doc_url,
        doc_name: item.doc_name,
        is_hidden: item.isHidden,
      }, { onConflict: 'id' });
    }
  }
};

// ==========================================
// SUBFOLDER & SCHEMA QUERIES
// ==========================================

export const getContractSubfolders = async (_contractId: string): Promise<ContractSubfolder[]> => {
  // Subfolders are stored in organizer_layouts.subfolders JSONB
  const { data } = await supabase
    .from('organizer_layouts')
    .select('subfolders')
    .eq('contract_id', _contractId)
    .single();

  return (data?.subfolders || []) as ContractSubfolder[];
};

export const getFolderSchema = async (contractId: string): Promise<Record<string, FolderSchemaField[]>> => {
  const { data } = await supabase
    .from('organizer_layouts')
    .select('schemas')
    .eq('contract_id', contractId)
    .single();

  return (data?.schemas || {}) as Record<string, FolderSchemaField[]>;
};

export const getExtractedData = async (contractId: string): Promise<ExtractedData[]> => {
  const { data, error } = await supabase
    .from('extracted_data')
    .select('*')
    .eq('contract_id', contractId);

  if (error) return [];
  return (data || []).map(mapExtractedData);
};

export const saveExtractedData = async (item: ExtractedData): Promise<void> => {
  await supabase.from('extracted_data').upsert({
    id: item.id,
    contract_id: item.contract_id,
    subfolder_id: item.subfolder_id,
    field_key: item.field_key,
    value: item.value,
    confidence: item.confidence,
    evidence: item.evidence,
    status: item.status,
    doc_url: item.doc_url,
    doc_name: item.doc_name,
    is_hidden: item.isHidden,
  }, { onConflict: 'id' });
};

function mapExtractedData(row: any): ExtractedData {
  return {
    id: row.id,
    contract_id: row.contract_id,
    subfolder_id: row.subfolder_id,
    field_key: row.field_key,
    value: row.value,
    confidence: row.confidence || 0,
    evidence: row.evidence || { page: 0, snippet: '' },
    status: row.status || 'extracted',
    doc_url: row.doc_url,
    doc_name: row.doc_name,
    isHidden: row.is_hidden,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ==========================================
// ORGANIZER LAYOUT
// ==========================================

export const getOrganizerLayout = async (contractId: string): Promise<OrganizerFolderLayout[]> => {
  const { data } = await supabase
    .from('organizer_layouts')
    .select('layout')
    .eq('contract_id', contractId)
    .single();

  return (data?.layout || []) as OrganizerFolderLayout[];
};

export const saveOrganizerLayout = async (contractId: string, layout: OrganizerFolderLayout[]): Promise<void> => {
  await supabase
    .from('organizer_layouts')
    .upsert({
      contract_id: contractId,
      layout,
    }, { onConflict: 'contract_id' });
};

// ==========================================
// FILE UPLOADS (Supabase Storage)
// ==========================================

export const uploadContractDocument = async (
  contractId: string,
  file: File
): Promise<string> => {
  const filePath = `contracts/${contractId}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from('contract-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('contract-documents')
    .getPublicUrl(filePath);

  return publicUrl;
};
