
/**
 * Database Service — Supabase Cloud Database
 * Primary data layer for contracts, clauses, and chat messages.
 * Falls back to IndexedDB for offline scenarios.
 */

import { SavedContract, Clause, BotMessage } from '@/types';
import { supabase } from '@/lib/supabase';

// ==========================================
// CONTRACT CRUD
// ==========================================

export const saveContractToDB = async (contract: SavedContract): Promise<SavedContract> => {
  if (!contract.id) {
    contract.id = crypto.randomUUID();
  }
  contract.timestamp = Date.now();

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Upsert contract
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
        created_by: user?.id,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;

    // If contract has clauses, save them too
    if (contract.clauses && contract.clauses.length > 0) {
      await saveClauses(contract.id, contract.clauses);
    }

    return { ...contract, ...data, timestamp: Date.now() };
  } catch (error) {
    console.error('Supabase save failed:', error);
    throw error;
  }
};

export const getAllContracts = async (_options?: { metadataOnly?: boolean }): Promise<SavedContract[]> => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return (data || [])
        .filter(row => row.is_deleted !== true)
        .map(row => ({
          id: row.id,
          name: row.name,
          title: row.title || row.name,
          project_id: row.project_id,
          contractor_id: row.contractor_id,
          contractor_name: row.contractor_name,
          contract_number: row.contract_number,
          status: row.status || 'agentic_ready',
          start_date: row.start_date,
          end_date: row.end_date,
          currency: row.currency,
          value: row.value,
          scope_text: row.scope_text,
          timestamp: new Date(row.updated_at || row.created_at).getTime(),
          sections: row.sections,
          metadata: row.metadata || { totalClauses: 0, generalCount: 0, particularCount: 0, highRiskCount: 0, conflictCount: 0 },
          ingestion_progress: row.ingestion_progress,
          version: row.version || 1,
          is_deleted: row.is_deleted || false,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
        }));
    }

    // Fallback to server-side endpoint if client RLS returned 0 rows
    const apiRes = await fetch('/api/contracts-api');
    if (apiRes.ok) {
      const serverContracts = await apiRes.json();
      if (Array.isArray(serverContracts) && serverContracts.length > 0) {
        return serverContracts;
      }
    }

    return [];
  } catch (error) {
    console.warn('Direct Supabase list failed, attempting API fallback:', error);
    try {
      const apiRes = await fetch('/api/contracts-api');
      if (apiRes.ok) {
        const serverContracts = await apiRes.json();
        if (Array.isArray(serverContracts)) return serverContracts;
      }
    } catch { /* silent */ }
    return [];
  }
};

export const getContractById = async (id: string): Promise<SavedContract | null> => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    // Also fetch clauses
    const { data: clauseRows } = await supabase
      .from('clauses')
      .select('*')
      .eq('contract_id', id)
      .order('order_index', { ascending: true });

    const contract: SavedContract = {
      id: data.id,
      name: data.name,
      title: data.title || data.name,
      project_id: data.project_id,
      contractor_id: data.contractor_id,
      contractor_name: data.contractor_name,
      contract_number: data.contract_number,
      status: data.status || 'draft',
      start_date: data.start_date,
      end_date: data.end_date,
      currency: data.currency,
      value: data.value,
      scope_text: data.scope_text,
      timestamp: new Date(data.updated_at || data.created_at).getTime(),
      clauses: (clauseRows || []).map(mapClauseFromDB),
      sections: data.sections,
      metadata: data.metadata || { totalClauses: 0, generalCount: 0, particularCount: 0, highRiskCount: 0, conflictCount: 0 },
      ingestion_progress: data.ingestion_progress,
      version: data.version || 1,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return contract;
  } catch (error) {
    console.error('getContractById failed:', error);
    return null;
  }
};

export const deleteContractFromDB = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('contracts')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Supabase delete failed:', error);
    throw error;
  }
};

// ==========================================
// CLAUSE OPERATIONS
// ==========================================

async function saveClauses(contractId: string, clauses: Clause[]): Promise<void> {
  // Delete existing clauses for this contract then re-insert
  await supabase.from('clauses').delete().eq('contract_id', contractId);

  const rows = clauses.map((c, index) => ({
    contract_id: contractId,
    clause_number: c.clause_number,
    clause_title: c.clause_title,
    condition_type: c.condition_type || 'General',
    clause_text: c.clause_text || '',
    general_condition: c.general_condition,
    particular_condition: c.particular_condition,
    comparison: c.comparison || [],
    has_time_frame: c.has_time_frame || false,
    time_frames: c.time_frames || [],
    financial_assets: c.financial_assets || [],
    category: c.category,
    chapter: c.chapter,
    section: c.section,
    gc_link_tokens: c.gc_link_tokens,
    pc_link_tokens: c.pc_link_tokens,
    is_hidden: c.isHidden || false,
    order_index: index,
  }));

  if (rows.length > 0) {
    const { error } = await supabase.from('clauses').insert(rows);
    if (error) console.error('Failed to save clauses:', error);
  }
}

function mapClauseFromDB(row: any): Clause {
  return {
    clause_number: row.clause_number,
    clause_title: row.clause_title,
    condition_type: row.condition_type || 'General',
    clause_text: row.clause_text || '',
    general_condition: row.general_condition,
    particular_condition: row.particular_condition,
    comparison: row.comparison || [],
    has_time_frame: row.has_time_frame,
    time_frames: row.time_frames || [],
    financial_assets: row.financial_assets || [],
    category: row.category,
    chapter: row.chapter,
    section: row.section,
    gc_link_tokens: row.gc_link_tokens,
    pc_link_tokens: row.pc_link_tokens,
    isHidden: row.is_hidden,
  };
}

// ==========================================
// CHAT MESSAGES
// ==========================================

export const saveChatMessage = async (contractId: string, message: BotMessage): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('chat_messages').insert({
      contract_id: contractId,
      user_id: user?.id,
      role: message.role,
      content: message.content,
      suggestions: message.suggestions,
    });
  } catch (error) {
    console.error('Failed to save chat message:', error);
  }
};

export const getChatHistory = async (contractId: string): Promise<BotMessage[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      role: row.role as 'user' | 'assistant',
      content: row.content,
      timestamp: new Date(row.created_at).getTime(),
      suggestions: row.suggestions,
    }));
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }
};

// ==========================================
// KNOWLEDGE ITEMS
// ==========================================

export const saveKnowledgeItem = async (item: { id: string; name: string; data: any }): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('knowledge_items').upsert({
    id: item.id,
    name: item.name,
    data: item.data,
    size: JSON.stringify(item.data).length,
    created_by: user?.id,
  }, { onConflict: 'id' });
};

export const listKnowledgeItems = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('knowledge_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
};

export const getKnowledgeItem = async (id: string): Promise<any | null> => {
  const { data } = await supabase
    .from('knowledge_items')
    .select('*')
    .eq('id', id)
    .single();

  return data;
};

// ==========================================
// DB ACCESS OBJECT (backward compat)
// ==========================================

export const db = {
  contracts: {
    insert: (item: any) => saveContractToDB(item),
    update: (id: string, updates: any) => saveContractToDB({ ...updates, id }),
    get: (id: string) => getContractById(id),
    getAll: () => getAllContracts(),
  },
  sections: {
    insert: async (_item: any) => {},
    update: async (_id: string, _updates: any) => {},
    getByContract: async (_contractId: string) => [],
  },
  clauses: {
    batchInsert: async (items: any[]) => {
      if (items.length > 0 && items[0].contract_id) {
        await saveClauses(items[0].contract_id, items);
      }
    },
    countByContract: async (contractId: string) => {
      const { count } = await supabase
        .from('clauses')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contractId);
      return count || 0;
    },
  },
  messages: {
    save: (contractId: string, message: any) => saveChatMessage(contractId, message),
    getHistory: (contractId: string) => getChatHistory(contractId),
  },
};

// ==========================================
// FALLBACK INDEXED DB (offline only)
// ==========================================

const DB_NAME = 'AAA_Contract_DB';
const STORES = { CONTRACTS: 'contracts' };
const DB_VERSION = 2;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.CONTRACTS)) {
        db.createObjectStore(STORES.CONTRACTS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

async function saveToIndexedDB(item: any): Promise<any> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTRACTS, 'readwrite');
    const store = tx.objectStore(STORES.CONTRACTS);
    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromIndexedDB(_options?: any): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CONTRACTS, 'readonly');
    const store = tx.objectStore(STORES.CONTRACTS);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteFromIndexedDB(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORES.CONTRACTS, 'readwrite');
  tx.objectStore(STORES.CONTRACTS).delete(id);
}

export const migrateLocalToFirestore = async () => 0;
