/**
 * Document Override Service
 * Implements document priority and override tracking
 * PC over GC, addendums over base, later addendums over earlier
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DocumentOverride,
  OverrideType,
  ContractDocument,
  DocumentGroup,
  DocumentGroupLabels
} from '../types';

/**
 * Document priority rules based on FIDIC contract structure:
 * 1. Form of Agreement (A) - Highest priority for contract-level data
 * 2. Letter of Acceptance (B) - Second highest
 * 3. Addendums (D) - Override earlier documents, later addendums override earlier
 * 4. Particular Conditions (C-PC) - Override General Conditions
 * 5. General Conditions (C-GC) - Base conditions
 * 6. BOQ (I) - Price/quantity reference
 * 7. Schedules/Annexes (N) - Supporting documents
 */

const DOCUMENT_PRIORITY: Record<DocumentGroup, number> = {
  [DocumentGroup.A]: 100,  // Form of Agreement - highest
  [DocumentGroup.B]: 90,   // Letter of Acceptance
  [DocumentGroup.D]: 80,   // Addendums (further sorted by date)
  [DocumentGroup.C]: 70,   // Conditions of Contract
  [DocumentGroup.I]: 60,   // BOQ
  [DocumentGroup.N]: 50    // Schedules/Annexes - lowest
};

// Sub-priority within Conditions of Contract
const CONDITIONS_PRIORITY: Record<string, number> = {
  'particular': 10,  // PC overrides GC
  'general': 5
};

export interface OverrideRelationship {
  overridingDocument: ContractDocument;
  overriddenDocument: ContractDocument;
  overrideType: OverrideType;
  reason: string;
  affectedClauses?: string[];
}

export interface PriorityResult {
  document: ContractDocument;
  priority: number;
  isOverridden: boolean;
  overriddenBy: string[];
}

export interface EffectiveContent {
  clauseNumber: string;
  content: string;
  sourceDocument: ContractDocument;
  isComposite: boolean;
  overrideChain: Array<{
    document: ContractDocument;
    content: string;
    overrideType: OverrideType;
  }>;
}

export class DocumentOverrideService {
  private supabase: SupabaseClient;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Calculate document priority score
   */
  calculatePriority(document: ContractDocument): number {
    let priority = DOCUMENT_PRIORITY[document.document_group] || 0;

    // For Conditions of Contract, check if PC or GC
    if (document.document_group === DocumentGroup.C) {
      const nameLower = document.name.toLowerCase();
      if (nameLower.includes('particular')) {
        priority += CONDITIONS_PRIORITY['particular'];
      } else if (nameLower.includes('general')) {
        priority += CONDITIONS_PRIORITY['general'];
      }
    }

    // For Addendums, add effective date factor (later = higher priority)
    if (document.document_group === DocumentGroup.D && document.effective_date) {
      const dateValue = new Date(document.effective_date).getTime();
      // Normalize date to 0-10 range
      const datePriority = Math.min(10, dateValue / (Date.now() / 10));
      priority += datePriority;
    }

    // Add sequence number as tiebreaker (higher sequence = later/higher priority)
    priority += document.sequence_number * 0.1;

    return priority;
  }

  /**
   * Determine override relationships between documents
   */
  async determineOverrideRelationships(
    contractId: string
  ): Promise<OverrideRelationship[]> {
    // Get all documents for the contract
    const { data: documents, error } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId)
      .order('document_group')
      .order('effective_date', { ascending: true })
      .order('sequence_number');

    if (error || !documents) {
      console.error('Error fetching documents:', error);
      return [];
    }

    const relationships: OverrideRelationship[] = [];

    // Group documents by type
    const byGroup: Record<DocumentGroup, ContractDocument[]> = {
      [DocumentGroup.A]: [],
      [DocumentGroup.B]: [],
      [DocumentGroup.C]: [],
      [DocumentGroup.D]: [],
      [DocumentGroup.I]: [],
      [DocumentGroup.N]: []
    };

    for (const doc of documents) {
      byGroup[doc.document_group as DocumentGroup]?.push(doc);
    }

    // PC overrides GC
    const pcDocs = byGroup[DocumentGroup.C].filter(d => 
      d.name.toLowerCase().includes('particular')
    );
    const gcDocs = byGroup[DocumentGroup.C].filter(d => 
      d.name.toLowerCase().includes('general')
    );

    for (const pc of pcDocs) {
      for (const gc of gcDocs) {
        relationships.push({
          overridingDocument: pc,
          overriddenDocument: gc,
          overrideType: 'partial',
          reason: 'Particular Conditions override General Conditions where applicable'
        });
      }
    }

    // Addendums override Conditions and earlier addendums
    const addendums = byGroup[DocumentGroup.D].sort((a, b) => {
      const dateA = a.effective_date ? new Date(a.effective_date).getTime() : 0;
      const dateB = b.effective_date ? new Date(b.effective_date).getTime() : 0;
      return dateA - dateB;
    });

    // Each addendum overrides conditions
    for (const addendum of addendums) {
      for (const condition of byGroup[DocumentGroup.C]) {
        relationships.push({
          overridingDocument: addendum,
          overriddenDocument: condition,
          overrideType: 'clause_specific',
          reason: `Addendum dated ${addendum.effective_date || 'unknown'} modifies Conditions of Contract`
        });
      }
    }

    // Later addendums override earlier addendums
    for (let i = 1; i < addendums.length; i++) {
      for (let j = 0; j < i; j++) {
        relationships.push({
          overridingDocument: addendums[i],
          overriddenDocument: addendums[j],
          overrideType: 'clause_specific',
          reason: `Later addendum (${addendums[i].effective_date}) supersedes earlier (${addendums[j].effective_date})`
        });
      }
    }

    // LOA can modify Agreement
    for (const loa of byGroup[DocumentGroup.B]) {
      for (const agreement of byGroup[DocumentGroup.A]) {
        relationships.push({
          overridingDocument: loa,
          overriddenDocument: agreement,
          overrideType: 'partial',
          reason: 'Letter of Acceptance may clarify or modify Form of Agreement terms'
        });
      }
    }

    return relationships;
  }

  /**
   * Save override relationships to database
   */
  async saveOverrideRelationships(
    contractId: string,
    relationships: OverrideRelationship[]
  ): Promise<{ saved: number; errors: string[] }> {
    const errors: string[] = [];
    let saved = 0;

    for (const rel of relationships) {
      const override: Partial<DocumentOverride> = {
        contract_id: contractId,
        overriding_document_id: rel.overridingDocument.id,
        overridden_document_id: rel.overriddenDocument.id,
        override_scope: `${rel.overridingDocument.document_group} -> ${rel.overriddenDocument.document_group}`,
        override_type: rel.overrideType,
        affected_clauses: rel.affectedClauses,
        reason: rel.reason,
        effective_date: rel.overridingDocument.effective_date
      };

      const { error } = await this.supabase
        .from('document_overrides')
        .upsert(override, {
          onConflict: 'contract_id,overriding_document_id,overridden_document_id,override_scope'
        });

      if (error) {
        errors.push(`${rel.overridingDocument.name} -> ${rel.overriddenDocument.name}: ${error.message}`);
      } else {
        saved++;
      }
    }

    return { saved, errors };
  }

  /**
   * Auto-detect and save override relationships for a contract
   */
  async processContractOverrides(contractId: string): Promise<{ saved: number; errors: string[] }> {
    const relationships = await this.determineOverrideRelationships(contractId);
    return this.saveOverrideRelationships(contractId, relationships);
  }

  /**
   * Get all overrides for a contract
   */
  async getContractOverrides(contractId: string): Promise<DocumentOverride[]> {
    const { data, error } = await this.supabase
      .from('document_overrides')
      .select('*')
      .eq('contract_id', contractId)
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('Error fetching overrides:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get documents that override a specific document
   */
  async getOverridingDocuments(documentId: string): Promise<DocumentOverride[]> {
    const { data, error } = await this.supabase
      .from('document_overrides')
      .select('*')
      .eq('overridden_document_id', documentId);

    if (error) {
      console.error('Error fetching overriding documents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get documents that are overridden by a specific document
   */
  async getOverriddenDocuments(documentId: string): Promise<DocumentOverride[]> {
    const { data, error } = await this.supabase
      .from('document_overrides')
      .select('*')
      .eq('overriding_document_id', documentId);

    if (error) {
      console.error('Error fetching overridden documents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Check if a specific clause is overridden
   */
  async isClauseOverridden(
    contractId: string,
    clauseNumber: string,
    documentId: string
  ): Promise<{ isOverridden: boolean; overriddenBy: string[] }> {
    // Get overrides where the document is overridden
    const { data: overrides, error } = await this.supabase
      .from('document_overrides')
      .select(`
        *,
        overriding_document:contract_documents!overriding_document_id(name)
      `)
      .eq('contract_id', contractId)
      .eq('overridden_document_id', documentId);

    if (error || !overrides) {
      return { isOverridden: false, overriddenBy: [] };
    }

    const overriddenBy: string[] = [];

    for (const override of overrides) {
      // Check if this override affects the specific clause
      if (
        override.override_type === 'full' ||
        !override.affected_clauses ||
        override.affected_clauses.includes(clauseNumber)
      ) {
        overriddenBy.push((override.overriding_document as any)?.name || 'Unknown');
      }
    }

    return {
      isOverridden: overriddenBy.length > 0,
      overriddenBy
    };
  }

  /**
   * Get effective content for a clause (considering overrides)
   */
  async getEffectiveClauseContent(
    contractId: string,
    clauseNumber: string
  ): Promise<EffectiveContent | null> {
    // Get all chunks with this clause number
    const { data: chunks, error } = await this.supabase
      .from('contract_document_chunks')
      .select(`
        *,
        document:contract_documents(*)
      `)
      .eq('contract_id', contractId)
      .eq('clause_number', clauseNumber);

    if (error || !chunks || chunks.length === 0) {
      return null;
    }

    // Get all overrides for the contract
    const overrides = await this.getContractOverrides(contractId);

    // Build override chain
    const overrideChain: EffectiveContent['overrideChain'] = [];
    const documentsById = new Map<string, ContractDocument>();
    
    for (const chunk of chunks) {
      const doc = (chunk as any).document as ContractDocument;
      documentsById.set(doc.id, doc);
    }

    // Sort chunks by document priority
    const sortedChunks = [...chunks].sort((a, b) => {
      const docA = (a as any).document as ContractDocument;
      const docB = (b as any).document as ContractDocument;
      return this.calculatePriority(docB) - this.calculatePriority(docA);
    });

    // Build override chain
    for (const chunk of sortedChunks) {
      const doc = (chunk as any).document as ContractDocument;
      
      // Determine override type from overrides table
      let overrideType: OverrideType = 'full';
      for (const override of overrides) {
        if (override.overriding_document_id === doc.id) {
          overrideType = override.override_type;
          break;
        }
      }

      overrideChain.push({
        document: doc,
        content: chunk.content,
        overrideType
      });
    }

    // The effective content is from the highest priority document
    const topChunk = sortedChunks[0];
    const topDoc = (topChunk as any).document as ContractDocument;

    return {
      clauseNumber,
      content: topChunk.content,
      sourceDocument: topDoc,
      isComposite: sortedChunks.length > 1,
      overrideChain
    };
  }

  /**
   * Get all documents with priority scores
   */
  async getDocumentsWithPriority(contractId: string): Promise<PriorityResult[]> {
    const { data: documents, error } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId);

    if (error || !documents) {
      return [];
    }

    const overrides = await this.getContractOverrides(contractId);

    return documents.map(doc => {
      const overriddenBy = overrides
        .filter(o => o.overridden_document_id === doc.id)
        .map(o => o.overriding_document_id);

      return {
        document: doc,
        priority: this.calculatePriority(doc),
        isOverridden: overriddenBy.length > 0,
        overriddenBy
      };
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create manual override relationship
   */
  async createManualOverride(
    contractId: string,
    overridingDocumentId: string,
    overriddenDocumentId: string,
    options: {
      scope: string;
      type: OverrideType;
      reason: string;
      affectedClauses?: string[];
    }
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('document_overrides')
      .insert({
        contract_id: contractId,
        overriding_document_id: overridingDocumentId,
        overridden_document_id: overriddenDocumentId,
        override_scope: options.scope,
        override_type: options.type,
        affected_clauses: options.affectedClauses,
        reason: options.reason
      });

    if (error) {
      console.error('Error creating manual override:', error);
      return false;
    }

    return true;
  }

  /**
   * Delete override relationship
   */
  async deleteOverride(overrideId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('document_overrides')
      .delete()
      .eq('id', overrideId);

    if (error) {
      console.error('Error deleting override:', error);
      return false;
    }

    return true;
  }

  /**
   * Get override summary for a contract
   */
  async getOverrideSummary(contractId: string): Promise<{
    totalOverrides: number;
    byType: Record<OverrideType, number>;
    byGroup: Record<DocumentGroup, { overriding: number; overridden: number }>;
  }> {
    const overrides = await this.getContractOverrides(contractId);

    const byType: Record<OverrideType, number> = {
      full: 0,
      partial: 0,
      clause_specific: 0
    };

    const byGroup: Record<DocumentGroup, { overriding: number; overridden: number }> = {
      [DocumentGroup.A]: { overriding: 0, overridden: 0 },
      [DocumentGroup.B]: { overriding: 0, overridden: 0 },
      [DocumentGroup.C]: { overriding: 0, overridden: 0 },
      [DocumentGroup.D]: { overriding: 0, overridden: 0 },
      [DocumentGroup.I]: { overriding: 0, overridden: 0 },
      [DocumentGroup.N]: { overriding: 0, overridden: 0 }
    };

    // Get documents to determine groups
    const { data: documents } = await this.supabase
      .from('contract_documents')
      .select('id, document_group')
      .eq('contract_id', contractId);

    const docGroupMap = new Map<string, DocumentGroup>();
    for (const doc of documents || []) {
      docGroupMap.set(doc.id, doc.document_group as DocumentGroup);
    }

    for (const override of overrides) {
      byType[override.override_type]++;

      const overridingGroup = docGroupMap.get(override.overriding_document_id);
      const overriddenGroup = docGroupMap.get(override.overridden_document_id);

      if (overridingGroup) {
        byGroup[overridingGroup].overriding++;
      }
      if (overriddenGroup) {
        byGroup[overriddenGroup].overridden++;
      }
    }

    return {
      totalOverrides: overrides.length,
      byType,
      byGroup
    };
  }
}

// Singleton instance
let overrideService: DocumentOverrideService | null = null;

export function getDocumentOverrideService(): DocumentOverrideService {
  if (!overrideService) {
    overrideService = new DocumentOverrideService();
  }
  return overrideService;
}

export default DocumentOverrideService;
