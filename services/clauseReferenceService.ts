/**
 * Clause Cross-Reference Detection and Linking Service
 * Detects references between clauses across documents and creates bidirectional links
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ClauseReference,
  ReferenceType,
  DocumentChunk,
  ContractDocument,
  DocumentGroup
} from '../types';

// Regex patterns for detecting clause references
const REFERENCE_PATTERNS = {
  // Clause 1.1, Clause 22A.1, Sub-Clause 2.3
  explicitClause: /(?:Clause|Sub-Clause|Article)\s*(\d+[A-Za-z]?(?:\.\d+)*(?:\s*\([a-z]+\))?)/gi,
  
  // "as per 1.1", "under 2.3", "per clause 5.1"
  implicitClause: /(?:as per|under|per|pursuant to|in accordance with|refer to|see)\s*(?:Clause|Sub-Clause)?\s*(\d+[A-Za-z]?(?:\.\d+)*)/gi,
  
  // Parenthetical references: (Clause 1.1), [see 2.3]
  parentheticalClause: /[(\[]\s*(?:Clause|Sub-Clause|see)?\s*(\d+[A-Za-z]?(?:\.\d+)*)\s*[)\]]/gi,
  
  // Direct number references at start: "1.1 (b)", "2A.1"
  directNumber: /\b(\d+[A-Za-z]?(?:\.\d+)+(?:\s*\([a-z]+\))?)\b/g,
  
  // Appendix/Annex references
  appendixRef: /(?:Appendix|Annex|Schedule)\s*([A-Z0-9]+)/gi,
  
  // Form references
  formRef: /(?:Form|Exhibit)\s*([A-Z0-9-]+)/gi
};

// Keywords that indicate override relationship
const OVERRIDE_KEYWORDS = [
  'delete', 'deleted', 'replace', 'replaced', 'substitute', 'substituted',
  'amend', 'amended', 'modify', 'modified', 'supersede', 'superseded',
  'override', 'overridden', 'notwithstanding', 'in lieu of'
];

// Keywords that indicate supplemental relationship
const SUPPLEMENT_KEYWORDS = [
  'add', 'added', 'addition', 'additional', 'supplement', 'supplemented',
  'insert', 'inserted', 'include', 'included', 'extend', 'extended'
];

export interface DetectedReference {
  targetClause: string;
  referenceText: string;
  referenceType: ReferenceType;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface ReferenceAnalysis {
  references: DetectedReference[];
  sourceClause: string;
  documentId?: string;
  chunkId?: string;
}

export interface ReferenceLinkingResult {
  created: number;
  updated: number;
  errors: string[];
  unresolvedReferences: DetectedReference[];
}

export class ClauseReferenceService {
  private supabase: SupabaseClient;
  private knownClauses: Set<string> = new Set();

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }

    this.supabase = createClient(url, key);
  }

  /**
   * Load known clauses for a contract to validate references
   */
  async loadKnownClauses(contractId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('contract_document_chunks')
      .select('clause_number')
      .eq('contract_id', contractId)
      .not('clause_number', 'is', null);

    if (error) {
      console.error('Error loading known clauses:', error);
      return;
    }

    this.knownClauses.clear();
    for (const row of data || []) {
      if (row.clause_number) {
        this.knownClauses.add(row.clause_number);
        // Also add parent clause numbers
        const parts = row.clause_number.split('.');
        for (let i = 1; i < parts.length; i++) {
          this.knownClauses.add(parts.slice(0, i).join('.'));
        }
      }
    }
  }

  /**
   * Detect references in text
   */
  detectReferences(text: string, sourceClause?: string): DetectedReference[] {
    const references: DetectedReference[] = [];
    const seenClauses = new Set<string>();

    // Determine reference type based on context
    const textLower = text.toLowerCase();
    const hasOverrideContext = OVERRIDE_KEYWORDS.some(kw => textLower.includes(kw));
    const hasSupplementContext = SUPPLEMENT_KEYWORDS.some(kw => textLower.includes(kw));

    // Check each pattern
    for (const [patternName, pattern] of Object.entries(REFERENCE_PATTERNS)) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const targetClause = this.normalizeClauseNumber(match[1]);
        
        // Skip self-references
        if (sourceClause && targetClause === this.normalizeClauseNumber(sourceClause)) {
          continue;
        }

        // Skip duplicates
        if (seenClauses.has(targetClause)) {
          continue;
        }
        seenClauses.add(targetClause);

        // Determine reference type
        let referenceType: ReferenceType = 'mentions';
        const surroundingText = text.substring(
          Math.max(0, match.index - 50),
          Math.min(text.length, match.index + match[0].length + 50)
        ).toLowerCase();

        if (hasOverrideContext || this.hasOverrideContext(surroundingText)) {
          referenceType = 'overrides';
        } else if (hasSupplementContext || this.hasSupplementContext(surroundingText)) {
          referenceType = 'supplements';
        } else if (patternName === 'appendixRef' || patternName === 'formRef') {
          referenceType = 'cross_reference';
        }

        // Calculate confidence
        const confidence = this.calculateConfidence(match[0], patternName, targetClause);

        references.push({
          targetClause,
          referenceText: match[0],
          referenceType,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence
        });
      }
    }

    // Sort by position in text
    references.sort((a, b) => a.startIndex - b.startIndex);

    return references;
  }

  /**
   * Normalize clause number format
   */
  normalizeClauseNumber(clause: string): string {
    return clause
      .trim()
      .replace(/\s+/g, '')  // Remove spaces
      .replace(/^0+/, '')    // Remove leading zeros
      .toUpperCase();
  }

  /**
   * Check if surrounding text indicates override
   */
  private hasOverrideContext(text: string): boolean {
    return OVERRIDE_KEYWORDS.some(kw => text.includes(kw));
  }

  /**
   * Check if surrounding text indicates supplement
   */
  private hasSupplementContext(text: string): boolean {
    return SUPPLEMENT_KEYWORDS.some(kw => text.includes(kw));
  }

  /**
   * Calculate confidence score for a reference
   */
  private calculateConfidence(matchText: string, patternName: string, targetClause: string): number {
    let confidence = 0.5;

    // Explicit "Clause X.X" references are most reliable
    if (patternName === 'explicitClause') {
      confidence = 0.95;
    } else if (patternName === 'implicitClause') {
      confidence = 0.85;
    } else if (patternName === 'parentheticalClause') {
      confidence = 0.80;
    } else if (patternName === 'directNumber') {
      // Direct numbers need validation
      confidence = 0.60;
    } else if (patternName === 'appendixRef' || patternName === 'formRef') {
      confidence = 0.90;
    }

    // Boost confidence if clause is known to exist
    if (this.knownClauses.has(targetClause)) {
      confidence = Math.min(1.0, confidence + 0.10);
    }

    // Reduce confidence for very short clause numbers
    if (targetClause.split('.').length === 1) {
      confidence *= 0.8;
    }

    return confidence;
  }

  /**
   * Analyze a chunk for references
   */
  analyzeChunk(chunk: DocumentChunk): ReferenceAnalysis {
    const references = this.detectReferences(chunk.content, chunk.clause_number);

    return {
      references,
      sourceClause: chunk.clause_number || 'unknown',
      documentId: chunk.document_id,
      chunkId: chunk.id
    };
  }

  /**
   * Analyze all chunks in a document for references
   */
  async analyzeDocument(documentId: string): Promise<ReferenceAnalysis[]> {
    const { data: chunks, error } = await this.supabase
      .from('contract_document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index');

    if (error) {
      console.error('Error fetching chunks:', error);
      return [];
    }

    // Load known clauses for validation
    if (chunks && chunks.length > 0) {
      await this.loadKnownClauses(chunks[0].contract_id);
    }

    return (chunks || []).map(chunk => this.analyzeChunk(chunk));
  }

  /**
   * Create reference links in database
   */
  async createReferenceLinks(
    contractId: string,
    analyses: ReferenceAnalysis[],
    confidenceThreshold: number = 0.7
  ): Promise<ReferenceLinkingResult> {
    const result: ReferenceLinkingResult = {
      created: 0,
      updated: 0,
      errors: [],
      unresolvedReferences: []
    };

    const referencesToInsert: Partial<ClauseReference>[] = [];

    for (const analysis of analyses) {
      for (const ref of analysis.references) {
        // Skip low-confidence references
        if (ref.confidence < confidenceThreshold) {
          result.unresolvedReferences.push(ref);
          continue;
        }

        // Check if target clause exists
        const isResolved = this.knownClauses.has(ref.targetClause);
        if (!isResolved) {
          result.unresolvedReferences.push(ref);
        }

        referencesToInsert.push({
          contract_id: contractId,
          source_clause_number: analysis.sourceClause,
          source_document_id: analysis.documentId,
          source_chunk_id: analysis.chunkId,
          target_clause_number: ref.targetClause,
          reference_type: ref.referenceType,
          reference_text: ref.referenceText,
          is_resolved: isResolved
        });
      }
    }

    // Deduplicate references
    const uniqueRefs = this.deduplicateReferences(referencesToInsert);

    // Batch insert
    const batchSize = 50;
    for (let i = 0; i < uniqueRefs.length; i += batchSize) {
      const batch = uniqueRefs.slice(i, i + batchSize);

      const { data, error } = await this.supabase
        .from('clause_references')
        .upsert(batch, {
          onConflict: 'contract_id,source_clause_number,target_clause_number,source_document_id'
        })
        .select('id');

      if (error) {
        result.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        result.created += data?.length || 0;
      }
    }

    return result;
  }

  /**
   * Deduplicate references
   */
  private deduplicateReferences(refs: Partial<ClauseReference>[]): Partial<ClauseReference>[] {
    const seen = new Set<string>();
    return refs.filter(ref => {
      const key = `${ref.source_clause_number}-${ref.target_clause_number}-${ref.source_document_id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get all references for a contract
   */
  async getContractReferences(contractId: string): Promise<ClauseReference[]> {
    const { data, error } = await this.supabase
      .from('clause_references')
      .select('*')
      .eq('contract_id', contractId)
      .order('source_clause_number');

    if (error) {
      console.error('Error fetching references:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get references FROM a specific clause
   */
  async getOutgoingReferences(
    contractId: string,
    clauseNumber: string
  ): Promise<ClauseReference[]> {
    const { data, error } = await this.supabase
      .from('clause_references')
      .select('*')
      .eq('contract_id', contractId)
      .eq('source_clause_number', clauseNumber);

    if (error) {
      console.error('Error fetching outgoing references:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get references TO a specific clause
   */
  async getIncomingReferences(
    contractId: string,
    clauseNumber: string
  ): Promise<ClauseReference[]> {
    const { data, error } = await this.supabase
      .from('clause_references')
      .select('*')
      .eq('contract_id', contractId)
      .eq('target_clause_number', clauseNumber);

    if (error) {
      console.error('Error fetching incoming references:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get all unresolved references for a contract
   */
  async getUnresolvedReferences(contractId: string): Promise<ClauseReference[]> {
    const { data, error } = await this.supabase
      .from('clause_references')
      .select('*')
      .eq('contract_id', contractId)
      .eq('is_resolved', false);

    if (error) {
      console.error('Error fetching unresolved references:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update reference resolution status
   */
  async resolveReferences(contractId: string): Promise<number> {
    // Load current known clauses
    await this.loadKnownClauses(contractId);

    // Get all unresolved references
    const unresolved = await this.getUnresolvedReferences(contractId);
    let resolvedCount = 0;

    for (const ref of unresolved) {
      if (this.knownClauses.has(ref.target_clause_number)) {
        const { error } = await this.supabase
          .from('clause_references')
          .update({ is_resolved: true })
          .eq('id', ref.id);

        if (!error) {
          resolvedCount++;
        }
      }
    }

    return resolvedCount;
  }

  /**
   * Delete all references for a document
   */
  async deleteDocumentReferences(documentId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('clause_references')
      .delete()
      .or(`source_document_id.eq.${documentId},target_document_id.eq.${documentId}`);

    if (error) {
      console.error('Error deleting references:', error);
      return false;
    }

    return true;
  }

  /**
   * Build clause reference graph for visualization
   */
  async buildReferenceGraph(contractId: string): Promise<{
    nodes: Array<{ id: string; label: string; group: string }>;
    edges: Array<{ source: string; target: string; type: ReferenceType }>;
  }> {
    const references = await this.getContractReferences(contractId);
    
    const nodesMap = new Map<string, { id: string; label: string; group: string }>();
    const edges: Array<{ source: string; target: string; type: ReferenceType }> = [];

    for (const ref of references) {
      // Add source node
      if (!nodesMap.has(ref.source_clause_number)) {
        nodesMap.set(ref.source_clause_number, {
          id: ref.source_clause_number,
          label: `Clause ${ref.source_clause_number}`,
          group: ref.source_clause_number.split('.')[0]
        });
      }

      // Add target node
      if (!nodesMap.has(ref.target_clause_number)) {
        nodesMap.set(ref.target_clause_number, {
          id: ref.target_clause_number,
          label: `Clause ${ref.target_clause_number}`,
          group: ref.target_clause_number.split('.')[0]
        });
      }

      // Add edge
      edges.push({
        source: ref.source_clause_number,
        target: ref.target_clause_number,
        type: ref.reference_type
      });
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges
    };
  }
}

// Singleton instance
let referenceService: ClauseReferenceService | null = null;

export function getClauseReferenceService(): ClauseReferenceService {
  if (!referenceService) {
    referenceService = new ClauseReferenceService();
  }
  return referenceService;
}

export default ClauseReferenceService;
