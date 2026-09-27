/**
 * Contract Retrieval Tools
 * 
 * Server-side / backend tools providing Antigravity with verified access
 * to contract documents, clauses, and sections stored in Supabase.
 */

import { supabase } from '../lib/supabase';

export interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  document_name?: string;
  document_group?: string;
  clause_number?: string | null;
  clause_title?: string | null;
  page_number?: number | null;
  content: string;
  metadata?: any;
}

export interface ClauseRecord {
  clause_reference: string;
  clause_title?: string;
  content: string;
  document_name?: string;
  document_group?: string;
  page_number?: number | null;
  particular_condition_override?: string | null;
}

/**
 * 1. search_contract
 * Search contract documents and clauses for relevant provisions, terms, or penalties.
 */
export async function searchContract(
  contractId: string,
  searchQuery: string,
  options: { documentGroup?: string; limit?: number } = {}
): Promise<RetrievedChunk[]> {
  const limit = options.limit || 6;
  const cleanQuery = searchQuery.trim();
  if (!cleanQuery) return [];

  // Try exact phrase matching first
  let query = (supabase as any)
    .from('contract_document_chunks')
    .select(`
      id,
      document_id,
      chunk_index,
      clause_number,
      clause_title,
      page_number,
      content,
      metadata,
      contract_documents:document_id ( name, document_group )
    `)
    .eq('contract_id', contractId);

  if (options.documentGroup) {
    query = query.eq('metadata->>group', options.documentGroup);
  }

  const { data: exactMatches, error: exactError } = await query
    .or(`content.ilike.%${cleanQuery}%,clause_title.ilike.%${cleanQuery}%`)
    .limit(limit);

  if (!exactError && exactMatches && exactMatches.length > 0) {
    return formatChunks(exactMatches);
  }

  // Fallback: Individual keyword matching
  const words = cleanQuery.split(/\s+/).filter(w => w.length > 3);
  if (words.length === 0) return [];

  const orFilter = words.map(w => `content.ilike.%${w}%,clause_title.ilike.%${w}%`).join(',');
  const { data: keywordMatches } = await (supabase as any)
    .from('contract_document_chunks')
    .select(`
      id,
      document_id,
      chunk_index,
      clause_number,
      clause_title,
      page_number,
      content,
      metadata,
      contract_documents:document_id ( name, document_group )
    `)
    .eq('contract_id', contractId)
    .or(orFilter)
    .limit(limit);

  return formatChunks(keywordMatches || []);
}

/**
 * 2. get_clause
 * Retrieve the complete verified contractual wording and any Particular Conditions override for a clause.
 */
export async function getClause(
  contractId: string,
  clauseRef: string
): Promise<ClauseRecord[]> {
  const cleanRef = clauseRef.replace(/^(clause|sub-clause|subclause)\s+/i, '').trim();
  if (!cleanRef) return [];

  // Look for exact clause_number match OR content mention of Clause/Sub-Clause
  const { data, error } = await (supabase as any)
    .from('contract_document_chunks')
    .select(`
      id,
      document_id,
      chunk_index,
      clause_number,
      clause_title,
      page_number,
      content,
      metadata,
      contract_documents:document_id ( name, document_group )
    `)
    .eq('contract_id', contractId)
    .or(`clause_number.eq.${cleanRef},content.ilike.%Clause ${cleanRef}%,content.ilike.%Sub-Clause ${cleanRef}%,content.ilike.%${cleanRef}.%`)
    .limit(8);

  if (error || !data) return [];

  // Group and format results, separating GC and PC (Particular Conditions)
  return data.map((item: any) => {
    const docName = item.contract_documents?.name || item.metadata?.document_type || '';
    const docGroup = item.contract_documents?.document_group || item.metadata?.group || '';
    const isParticular = docGroup === 'C' && (docName.toLowerCase().includes('particular') || item.content.toLowerCase().includes('appendix a'));

    return {
      clause_reference: item.clause_number || cleanRef,
      clause_title: item.clause_title || undefined,
      content: item.content,
      document_name: docName,
      document_group: docGroup,
      page_number: item.page_number,
      particular_condition_override: isParticular ? item.content : null
    };
  });
}

/**
 * 3. get_related_clauses
 * Retrieve clauses referenced by or relevant to another clause.
 */
export async function getRelatedClauses(
  contractId: string,
  clauseRef: string
): Promise<RetrievedChunk[]> {
  const cleanRef = clauseRef.replace(/^(clause|sub-clause)\s+/i, '').trim();
  
  // Search for chunks that reference this clause
  const { data } = await (supabase as any)
    .from('contract_document_chunks')
    .select(`
      id,
      document_id,
      chunk_index,
      clause_number,
      clause_title,
      page_number,
      content,
      metadata,
      contract_documents:document_id ( name, document_group )
    `)
    .eq('contract_id', contractId)
    .or(`content.ilike.%Clause ${cleanRef}%,content.ilike.%Sub-Clause ${cleanRef}%`)
    .limit(5);

  return formatChunks(data || []);
}

/**
 * 4. search_contract_documents
 * Search the list and overview of contract documents, appendices, and schedules.
 */
export async function searchContractDocuments(
  contractId: string,
  searchQuery: string
): Promise<Array<{ id: string; name: string; group: string; page_count?: number }>> {
  const cleanQuery = searchQuery.trim();
  let query = (supabase as any)
    .from('contract_documents')
    .select('id, name, document_group, page_count')
    .eq('contract_id', contractId);

  if (cleanQuery) {
    query = query.ilike('name', `%${cleanQuery}%`);
  }

  const { data, error } = await query.limit(10);
  if (error || !data) return [];

  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    group: d.document_group,
    page_count: d.page_count
  }));
}

/**
 * 5. search_project_documents
 * Search project correspondence, MOMs, programmes, notices where available.
 */
export async function searchProjectDocuments(
  contractId: string,
  searchQuery: string
): Promise<RetrievedChunk[]> {
  // Queries chunks in project group documents (or non-contract conditions)
  const cleanQuery = searchQuery.trim();
  const { data } = await (supabase as any)
    .from('contract_document_chunks')
    .select(`
      id,
      document_id,
      chunk_index,
      clause_number,
      clause_title,
      page_number,
      content,
      metadata,
      contract_documents:document_id ( name, document_group )
    `)
    .eq('contract_id', contractId)
    .or(`content.ilike.%${cleanQuery}%,clause_title.ilike.%${cleanQuery}%`)
    .limit(5);

  return formatChunks(data || []);
}

function formatChunks(rawList: any[]): RetrievedChunk[] {
  return rawList.map(item => ({
    chunk_id: item.id,
    document_id: item.document_id,
    document_name: item.contract_documents?.name || item.metadata?.document_type || undefined,
    document_group: item.contract_documents?.document_group || item.metadata?.group || undefined,
    clause_number: item.clause_number,
    clause_title: item.clause_title,
    page_number: item.page_number,
    content: item.content,
    metadata: item.metadata
  }));
}
