/**
 * Ingestion Validation Service
 * Implements the 10 failure case checks from the architecture plan
 * Validates contract ingestion quality and integrity
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
  DocumentChunk,
  ContractDocument,
  ClauseReference,
  DocumentGroup,
  validateFileName
} from '../types';

// Validation thresholds
const VALIDATION_CONFIG = {
  minOCRConfidence: 0.8,
  maxDuplicateThreshold: 0.95,  // Content similarity threshold for duplicate detection
  minClauseNumberLength: 1,
  maxClauseNumberLength: 20
};

// Regex for valid clause numbers
const CLAUSE_NUMBER_PATTERN = /^(\d+[A-Za-z]?(?:\.\d+)*(?:\s*\([a-z]+\))?)$/;

export interface ValidationContext {
  contractId: string;
  documents: ContractDocument[];
  chunks: DocumentChunk[];
  references: ClauseReference[];
}

export interface DuplicateChunkResult {
  chunk1Id: string;
  chunk2Id: string;
  similarity: number;
  contentPreview: string;
}

export interface ClauseMatchResult {
  clauseNumber: string;
  gcChunkId?: string;
  pcChunkId?: string;
  isExactMatch: boolean;
  isMismatched: boolean;
  mismatchReason?: string;
}

export class IngestionValidationService {
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
   * Load validation context for a contract
   */
  async loadValidationContext(contractId: string): Promise<ValidationContext> {
    const [documents, chunks, references] = await Promise.all([
      this.loadDocuments(contractId),
      this.loadChunks(contractId),
      this.loadReferences(contractId)
    ]);

    return { contractId, documents, chunks, references };
  }

  private async loadDocuments(contractId: string): Promise<ContractDocument[]> {
    const { data, error } = await this.supabase
      .from('contract_documents')
      .select('*')
      .eq('contract_id', contractId);
    
    if (error) throw error;
    return data || [];
  }

  private async loadChunks(contractId: string): Promise<DocumentChunk[]> {
    const { data, error } = await this.supabase
      .from('contract_document_chunks')
      .select('*')
      .eq('contract_id', contractId);
    
    if (error) throw error;
    return data || [];
  }

  private async loadReferences(contractId: string): Promise<ClauseReference[]> {
    const { data, error } = await this.supabase
      .from('clause_references')
      .select('*')
      .eq('contract_id', contractId);
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Run full validation suite
   */
  async validateIngestion(contractId: string): Promise<ValidationResult> {
    const context = await this.loadValidationContext(contractId);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Run all validation checks
    const checks = await Promise.all([
      this.checkDuplicateClauses(context),           // 1. Wrong clause matching
      this.checkOCRConfidence(context),              // 2. OCR errors in numbers
      this.checkDuplicateChunks(context),            // 3. Duplicate chunks
      this.checkAddendumOrder(context),              // 4. Addendum not superseding
      this.checkPCOverrides(context),                // 5. PC override missed
      this.checkTableExtraction(context),            // 6. Table extraction fails
      this.checkUnresolvedReferences(context),       // 7. Cross-reference to non-existent
      this.checkTokenLimits(context),                // 8. Token limit exceeded
      this.checkNamingConventions(context),          // 9. Annex misclassified
      this.checkVersionConflicts(context)            // 10. Version conflict
    ]);

    // Categorize results
    for (const result of checks) {
      if (result.severity === 'error') {
        errors.push(result);
      } else {
        warnings.push(result);
      }
    }

    // Calculate summary
    const unresolvedRefs = context.references.filter(r => !r.is_resolved).length;
    const lowConfidenceChunks = context.chunks.filter(
      c => c.confidence_score !== undefined && c.confidence_score < VALIDATION_CONFIG.minOCRConfidence
    ).length;

    return {
      isValid: errors.length === 0,
      errors: errors.filter(e => e.items.length > 0),
      warnings: warnings.filter(w => w.items.length > 0),
      summary: {
        totalDocuments: context.documents.length,
        totalChunks: context.chunks.length,
        totalReferences: context.references.length,
        unresolvedReferences: unresolvedRefs,
        lowConfidenceChunks
      }
    };
  }

  /**
   * Check 1: Wrong clause matching (e.g., 2.1 GC linked to 2.1.1 PC)
   */
  async checkDuplicateClauses(context: ValidationContext): Promise<ValidationError> {
    const duplicates: any[] = [];
    const clauseMap = new Map<string, DocumentChunk[]>();

    // Group chunks by clause number
    for (const chunk of context.chunks) {
      if (chunk.clause_number) {
        const existing = clauseMap.get(chunk.clause_number) || [];
        existing.push(chunk);
        clauseMap.set(chunk.clause_number, existing);
      }
    }

    // Check for duplicates within same document
    for (const [clauseNum, chunks] of clauseMap) {
      const byDocument = new Map<string, DocumentChunk[]>();
      for (const chunk of chunks) {
        const existing = byDocument.get(chunk.document_id) || [];
        existing.push(chunk);
        byDocument.set(chunk.document_id, existing);
      }

      for (const [docId, docChunks] of byDocument) {
        if (docChunks.length > 1) {
          duplicates.push({
            clauseNumber: clauseNum,
            documentId: docId,
            count: docChunks.length,
            chunkIds: docChunks.map(c => c.id)
          });
        }
      }
    }

    return {
      code: 'DUPLICATE_CLAUSE',
      message: 'Duplicate clause numbers found within same document',
      items: duplicates,
      severity: duplicates.length > 0 ? 'error' : 'warning'
    };
  }

  /**
   * Check 2: OCR errors in numbers (e.g., "14 days" → "1A days")
   */
  async checkOCRConfidence(context: ValidationContext): Promise<ValidationError> {
    const lowConfidence: any[] = [];

    for (const chunk of context.chunks) {
      if (chunk.confidence_score !== undefined && 
          chunk.confidence_score < VALIDATION_CONFIG.minOCRConfidence) {
        // Also check for common OCR errors in numbers
        const suspiciousPatterns = this.detectOCRErrors(chunk.content);
        
        lowConfidence.push({
          chunkId: chunk.id,
          clauseNumber: chunk.clause_number,
          confidence: chunk.confidence_score,
          suspiciousPatterns,
          contentPreview: chunk.content.substring(0, 100)
        });
      }
    }

    return {
      code: 'OCR_CONFIDENCE_LOW',
      message: 'Low OCR confidence or suspected OCR errors detected',
      items: lowConfidence,
      severity: lowConfidence.length > 5 ? 'error' : 'warning'
    };
  }

  /**
   * Detect common OCR errors in text
   */
  private detectOCRErrors(text: string): string[] {
    const patterns: string[] = [];

    // Common OCR number/letter substitutions
    const ocrMistakes = [
      { pattern: /\b(\d+)[oO](\d+)\b/g, desc: 'O/0 substitution in numbers' },
      { pattern: /\b[1Il][A-Za-z]/g, desc: '1/I/l confusion' },
      { pattern: /\brn\b/g, desc: 'rn/m confusion' },
      { pattern: /\bvv\b/g, desc: 'vv/w confusion' },
      { pattern: /\b(\d+)[A-Za-z](\d+)\s*days?\b/gi, desc: 'Letter in day count' },
      { pattern: /\b(\d+)[.,](\d{3})[.,](\d+)\b/g, desc: 'Inconsistent number formatting' }
    ];

    for (const { pattern, desc } of ocrMistakes) {
      if (pattern.test(text)) {
        patterns.push(desc);
      }
      pattern.lastIndex = 0; // Reset regex
    }

    return patterns;
  }

  /**
   * Check 3: Duplicate chunks from re-upload
   */
  async checkDuplicateChunks(context: ValidationContext): Promise<ValidationError> {
    const duplicates: DuplicateChunkResult[] = [];
    const hashGroups = new Map<string, DocumentChunk[]>();

    // Group by content hash
    for (const chunk of context.chunks) {
      if (chunk.content_hash) {
        const existing = hashGroups.get(chunk.content_hash) || [];
        existing.push(chunk);
        hashGroups.set(chunk.content_hash, existing);
      }
    }

    // Find duplicates
    for (const [hash, chunks] of hashGroups) {
      if (chunks.length > 1) {
        // Only flag if from different documents (same doc duplicates handled in check 1)
        const uniqueDocs = new Set(chunks.map(c => c.document_id));
        if (uniqueDocs.size > 1) {
          for (let i = 0; i < chunks.length - 1; i++) {
            duplicates.push({
              chunk1Id: chunks[i].id,
              chunk2Id: chunks[i + 1].id,
              similarity: 1.0,
              contentPreview: chunks[i].content.substring(0, 100)
            });
          }
        }
      }
    }

    return {
      code: 'DUPLICATE_CHUNK',
      message: 'Duplicate content found across different documents',
      items: duplicates,
      severity: duplicates.length > 0 ? 'warning' : 'warning'
    };
  }

  /**
   * Check 4: Addendum not superseding (wrong date order)
   */
  async checkAddendumOrder(context: ValidationContext): Promise<ValidationError> {
    const issues: any[] = [];
    
    // Get addendum documents
    const addendums = context.documents
      .filter(d => d.document_group === DocumentGroup.D)
      .sort((a, b) => a.sequence_number - b.sequence_number);

    // Check if sequence matches effective date order
    for (let i = 1; i < addendums.length; i++) {
      const prev = addendums[i - 1];
      const curr = addendums[i];

      if (prev.effective_date && curr.effective_date) {
        const prevDate = new Date(prev.effective_date);
        const currDate = new Date(curr.effective_date);

        if (currDate < prevDate) {
          issues.push({
            document1: { id: prev.id, name: prev.name, date: prev.effective_date, sequence: prev.sequence_number },
            document2: { id: curr.id, name: curr.name, date: curr.effective_date, sequence: curr.sequence_number },
            issue: 'Later sequence number has earlier effective date'
          });
        }
      } else if (!curr.effective_date) {
        issues.push({
          document: { id: curr.id, name: curr.name, sequence: curr.sequence_number },
          issue: 'Addendum missing effective date'
        });
      }
    }

    return {
      code: 'ADDENDUM_ORDER',
      message: 'Addendum order or date issues detected',
      items: issues,
      severity: issues.length > 0 ? 'error' : 'warning'
    };
  }

  /**
   * Check 5: PC override missed (GC shows as authoritative)
   */
  async checkPCOverrides(context: ValidationContext): Promise<ValidationError> {
    const missingOverrides: any[] = [];

    // Get GC and PC documents
    const gcDocs = context.documents.filter(d => 
      d.document_group === DocumentGroup.C && 
      d.name.toLowerCase().includes('general')
    );
    const pcDocs = context.documents.filter(d => 
      d.document_group === DocumentGroup.C && 
      d.name.toLowerCase().includes('particular')
    );

    if (gcDocs.length === 0 || pcDocs.length === 0) {
      return {
        code: 'MISSING_PC_OVERRIDE',
        message: 'No GC/PC override issues (missing GC or PC)',
        items: [],
        severity: 'warning'
      };
    }

    // Get clause numbers from both
    const gcClauses = new Set<string>();
    const pcClauses = new Set<string>();

    for (const chunk of context.chunks) {
      if (!chunk.clause_number) continue;
      
      const doc = context.documents.find(d => d.id === chunk.document_id);
      if (!doc) continue;

      if (gcDocs.some(g => g.id === doc.id)) {
        gcClauses.add(chunk.clause_number);
      }
      if (pcDocs.some(p => p.id === doc.id)) {
        pcClauses.add(chunk.clause_number);
      }
    }

    // Check for PC clauses that reference GC clauses
    const pcOverrideRefs = context.references.filter(r => 
      r.reference_type === 'overrides' &&
      pcClauses.has(r.source_clause_number)
    );

    // Find GC clauses that have PC versions but no override reference
    for (const gcClause of gcClauses) {
      if (pcClauses.has(gcClause)) {
        const hasOverrideRef = pcOverrideRefs.some(r => 
          r.source_clause_number === gcClause || r.target_clause_number === gcClause
        );
        
        if (!hasOverrideRef) {
          missingOverrides.push({
            clauseNumber: gcClause,
            issue: 'Clause exists in both GC and PC but no override relationship recorded'
          });
        }
      }
    }

    return {
      code: 'MISSING_PC_OVERRIDE',
      message: 'Potential PC overrides not properly linked',
      items: missingOverrides,
      severity: missingOverrides.length > 0 ? 'warning' : 'warning'
    };
  }

  /**
   * Check 6: Table extraction fails (BOQ becomes unstructured text)
   */
  async checkTableExtraction(context: ValidationContext): Promise<ValidationError> {
    const issues: any[] = [];

    // Check BOQ documents
    const boqDocs = context.documents.filter(d => d.document_group === DocumentGroup.I);
    
    for (const boqDoc of boqDocs) {
      const docChunks = context.chunks.filter(c => c.document_id === boqDoc.id);
      const tableChunks = docChunks.filter(c => c.content_type === 'table');
      
      if (docChunks.length > 0 && tableChunks.length === 0) {
        issues.push({
          documentId: boqDoc.id,
          documentName: boqDoc.name,
          issue: 'BOQ document has no table chunks - may have been extracted as plain text',
          totalChunks: docChunks.length
        });
      }

      // Check for table-like content in text chunks
      for (const chunk of docChunks) {
        if (chunk.content_type === 'text') {
          const hasTableIndicators = this.detectTableContent(chunk.content);
          if (hasTableIndicators) {
            issues.push({
              chunkId: chunk.id,
              documentName: boqDoc.name,
              issue: 'Text chunk appears to contain tabular data',
              contentPreview: chunk.content.substring(0, 100)
            });
          }
        }
      }
    }

    return {
      code: 'TABLE_EXTRACTION_FAILED',
      message: 'Table extraction issues in BOQ documents',
      items: issues,
      severity: issues.length > 0 ? 'warning' : 'warning'
    };
  }

  /**
   * Detect if text content looks like a table
   */
  private detectTableContent(text: string): boolean {
    const lines = text.split('\n');
    let tabularLines = 0;

    for (const line of lines) {
      // Check for multiple tab/pipe separators
      if (line.split(/\t|\|/).length > 3) {
        tabularLines++;
      }
      // Check for aligned numbers (common in BOQ)
      if (/\d+\.\d{2}\s+\d+\.\d{2}\s+\d+\.\d{2}/.test(line)) {
        tabularLines++;
      }
    }

    return tabularLines > lines.length * 0.3;
  }

  /**
   * Check 7: Cross-reference to non-existent clause
   */
  async checkUnresolvedReferences(context: ValidationContext): Promise<ValidationError> {
    const unresolved = context.references.filter(r => !r.is_resolved);

    const items = unresolved.map(r => ({
      referenceId: r.id,
      sourceClause: r.source_clause_number,
      targetClause: r.target_clause_number,
      referenceText: r.reference_text,
      issue: `Reference to ${r.target_clause_number} cannot be resolved`
    }));

    return {
      code: 'UNRESOLVED_REFERENCE',
      message: 'References to non-existent clauses found',
      items,
      severity: items.length > 10 ? 'error' : 'warning'
    };
  }

  /**
   * Check 8: Token limit exceeded (large document truncated)
   */
  async checkTokenLimits(context: ValidationContext): Promise<ValidationError> {
    const issues: any[] = [];
    const MAX_TOKENS_PER_CHUNK = 2000;
    const MIN_TOKENS_WARNING = 50;

    // Check for unusually large chunks
    for (const chunk of context.chunks) {
      if (chunk.token_count && chunk.token_count > MAX_TOKENS_PER_CHUNK) {
        issues.push({
          chunkId: chunk.id,
          clauseNumber: chunk.clause_number,
          tokenCount: chunk.token_count,
          issue: `Chunk exceeds ${MAX_TOKENS_PER_CHUNK} token limit`
        });
      }
    }

    // Check for documents with very few chunks (might be truncated)
    for (const doc of context.documents) {
      const docChunks = context.chunks.filter(c => c.document_id === doc.id);
      const totalTokens = docChunks.reduce((sum, c) => sum + (c.token_count || 0), 0);
      
      // If document has file size but very few tokens, might be truncated
      if (doc.file_size_bytes && doc.file_size_bytes > 100000 && totalTokens < 500) {
        issues.push({
          documentId: doc.id,
          documentName: doc.name,
          fileSize: doc.file_size_bytes,
          totalTokens,
          issue: 'Large file with very few tokens - possible truncation'
        });
      }
    }

    return {
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Token limit or truncation issues detected',
      items: issues,
      severity: issues.length > 0 ? 'error' : 'warning'
    };
  }

  /**
   * Check 9: Annex misclassified (Appendix D put in D/ instead of N/)
   */
  async checkNamingConventions(context: ValidationContext): Promise<ValidationError> {
    const issues: any[] = [];

    for (const doc of context.documents) {
      // Check filename convention
      if (doc.original_filename) {
        const validation = validateFileName(doc.original_filename);
        if (!validation.isValid) {
          issues.push({
            documentId: doc.id,
            documentName: doc.name,
            filename: doc.original_filename,
            errors: validation.errors,
            suggestedName: validation.suggestedName
          });
        }
      }

      // Check for common misclassifications
      const nameLower = doc.name.toLowerCase();
      
      // Appendix/Annex should be in N/, not D/
      if (doc.document_group === DocumentGroup.D && 
          (nameLower.includes('appendix') || nameLower.includes('annex') || nameLower.includes('schedule'))) {
        issues.push({
          documentId: doc.id,
          documentName: doc.name,
          currentGroup: doc.document_group,
          suggestedGroup: DocumentGroup.N,
          issue: 'Appendix/Annex/Schedule should be in group N, not D'
        });
      }

      // Addendum should be in D/, not N/
      if (doc.document_group === DocumentGroup.N && nameLower.includes('addendum')) {
        issues.push({
          documentId: doc.id,
          documentName: doc.name,
          currentGroup: doc.document_group,
          suggestedGroup: DocumentGroup.D,
          issue: 'Addendum should be in group D, not N'
        });
      }
    }

    return {
      code: 'NAMING_CONVENTION_VIOLATION',
      message: 'Naming convention or classification issues',
      items: issues,
      severity: issues.length > 0 ? 'warning' : 'warning'
    };
  }

  /**
   * Check 10: Version conflict (same clause modified in 2 addendums)
   */
  async checkVersionConflicts(context: ValidationContext): Promise<ValidationError> {
    const conflicts: any[] = [];

    // Get addendum documents
    const addendums = context.documents.filter(d => d.document_group === DocumentGroup.D);
    
    if (addendums.length < 2) {
      return {
        code: 'INVALID_CLAUSE_NUMBER',
        message: 'No version conflicts (less than 2 addendums)',
        items: [],
        severity: 'warning'
      };
    }

    // Group chunks by clause number and addendum
    const clausesByAddendum = new Map<string, Map<string, DocumentChunk[]>>();

    for (const addendum of addendums) {
      const addendumChunks = context.chunks.filter(c => c.document_id === addendum.id);
      
      for (const chunk of addendumChunks) {
        if (!chunk.clause_number) continue;

        if (!clausesByAddendum.has(chunk.clause_number)) {
          clausesByAddendum.set(chunk.clause_number, new Map());
        }
        
        const addendumMap = clausesByAddendum.get(chunk.clause_number)!;
        const existing = addendumMap.get(addendum.id) || [];
        existing.push(chunk);
        addendumMap.set(addendum.id, existing);
      }
    }

    // Find clauses modified in multiple addendums
    for (const [clauseNum, addendumMap] of clausesByAddendum) {
      if (addendumMap.size > 1) {
        const addendumIds = Array.from(addendumMap.keys());
        const addendumDocs = addendums.filter(a => addendumIds.includes(a.id));
        
        conflicts.push({
          clauseNumber: clauseNum,
          addendums: addendumDocs.map(a => ({
            id: a.id,
            name: a.name,
            effectiveDate: a.effective_date
          })),
          issue: `Clause ${clauseNum} is modified in ${addendumMap.size} different addendums`
        });
      }
    }

    return {
      code: 'INVALID_CLAUSE_NUMBER',
      message: 'Same clause modified in multiple addendums (potential conflict)',
      items: conflicts,
      severity: conflicts.length > 0 ? 'warning' : 'warning'
    };
  }

  /**
   * Generate validation report
   */
  async generateValidationReport(contractId: string): Promise<string> {
    const result = await this.validateIngestion(contractId);
    
    const lines: string[] = [
      '# Contract Ingestion Validation Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Contract ID: ${contractId}`,
      '',
      '## Summary',
      '',
      `- **Status**: ${result.isValid ? 'VALID' : 'INVALID'}`,
      `- **Total Documents**: ${result.summary.totalDocuments}`,
      `- **Total Chunks**: ${result.summary.totalChunks}`,
      `- **Total References**: ${result.summary.totalReferences}`,
      `- **Unresolved References**: ${result.summary.unresolvedReferences}`,
      `- **Low Confidence Chunks**: ${result.summary.lowConfidenceChunks}`,
      ''
    ];

    if (result.errors.length > 0) {
      lines.push('## Errors');
      lines.push('');
      for (const error of result.errors) {
        lines.push(`### ${error.code}`);
        lines.push(`${error.message}`);
        lines.push(`Found ${error.items.length} issues`);
        lines.push('');
      }
    }

    if (result.warnings.length > 0) {
      lines.push('## Warnings');
      lines.push('');
      for (const warning of result.warnings) {
        lines.push(`### ${warning.code}`);
        lines.push(`${warning.message}`);
        lines.push(`Found ${warning.items.length} issues`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

// Singleton instance
let validationService: IngestionValidationService | null = null;

export function getIngestionValidationService(): IngestionValidationService {
  if (!validationService) {
    validationService = new IngestionValidationService();
  }
  return validationService;
}

export default IngestionValidationService;
