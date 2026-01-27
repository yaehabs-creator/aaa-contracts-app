/**
 * Ingestion Services Index
 * Exports all services related to contract document ingestion
 */

// Upload Service
export {
  DocumentUploadService,
  getDocumentUploadService,
  type DocumentUploadOptions
} from './documentUploadService';

// Chunking Service
export {
  DocumentChunkingService,
  getDocumentChunkingService,
  type ChunkingOptions,
  type ParsedClause,
  type TableData,
  type ChunkingResult
} from './documentChunkingService';

// Cross-Reference Service
export {
  ClauseReferenceService,
  getClauseReferenceService,
  type DetectedReference,
  type ReferenceAnalysis,
  type ReferenceLinkingResult
} from './clauseReferenceService';

// Override Service
export {
  DocumentOverrideService,
  getDocumentOverrideService,
  type OverrideRelationship,
  type PriorityResult,
  type EffectiveContent
} from './documentOverrideService';

// Validation Service
export {
  IngestionValidationService,
  getIngestionValidationService,
  type ValidationContext,
  type DuplicateChunkResult,
  type ClauseMatchResult
} from './ingestionValidationService';

// Vector Search Service
export {
  VectorSearchService,
  getVectorSearchService,
  type EmbeddingResult,
  type SearchOptions,
  type SearchResult
} from './vectorSearchService';

/**
 * Full ingestion pipeline
 * Orchestrates the complete document ingestion workflow
 */
export async function runFullIngestionPipeline(
  contractId: string,
  documentId: string,
  options: {
    generateEmbeddings?: boolean;
    detectReferences?: boolean;
    processOverrides?: boolean;
    validateAfter?: boolean;
    onProgress?: (stage: string, progress: number) => void;
  } = {}
): Promise<{
  success: boolean;
  stages: Record<string, { success: boolean; message: string }>;
  validationResult?: any;
}> {
  const {
    generateEmbeddings = true,
    detectReferences = true,
    processOverrides = true,
    validateAfter = true,
    onProgress
  } = options;

  const stages: Record<string, { success: boolean; message: string }> = {};

  try {
    // Stage 1: Detect and create cross-references
    if (detectReferences) {
      onProgress?.('references', 0);
      const refService = getClauseReferenceService();
      const analyses = await refService.analyzeDocument(documentId);
      const refResult = await refService.createReferenceLinks(contractId, analyses);
      stages.references = {
        success: refResult.errors.length === 0,
        message: `Created ${refResult.created} references, ${refResult.unresolvedReferences.length} unresolved`
      };
      onProgress?.('references', 100);
    }

    // Stage 2: Process override relationships
    if (processOverrides) {
      onProgress?.('overrides', 0);
      const overrideService = getDocumentOverrideService();
      const overrideResult = await overrideService.processContractOverrides(contractId);
      stages.overrides = {
        success: overrideResult.errors.length === 0,
        message: `Processed ${overrideResult.saved} override relationships`
      };
      onProgress?.('overrides', 100);
    }

    // Stage 3: Generate embeddings
    if (generateEmbeddings) {
      onProgress?.('embeddings', 0);
      const searchService = getVectorSearchService();
      const embedResult = await searchService.embedDocument(documentId);
      stages.embeddings = {
        success: embedResult.failed === 0,
        message: `Embedded ${embedResult.successful}/${embedResult.total} chunks`
      };
      onProgress?.('embeddings', 100);
    }

    // Stage 4: Validate
    let validationResult;
    if (validateAfter) {
      onProgress?.('validation', 0);
      const validationService = getIngestionValidationService();
      validationResult = await validationService.validateIngestion(contractId);
      stages.validation = {
        success: validationResult.isValid,
        message: validationResult.isValid 
          ? 'Validation passed'
          : `Found ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`
      };
      onProgress?.('validation', 100);
    }

    return {
      success: Object.values(stages).every(s => s.success),
      stages,
      validationResult
    };

  } catch (error) {
    console.error('Ingestion pipeline error:', error);
    return {
      success: false,
      stages: {
        ...stages,
        error: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    };
  }
}

/**
 * Ingestion checklist helper
 * Returns a structured checklist for manual tracking
 */
export function getIngestionChecklist(): {
  preIngestion: string[];
  documentUpload: string[];
  postIngestion: string[];
  qualityChecks: string[];
} {
  return {
    preIngestion: [
      'Create folder structure: A/, B/, C/, D/, I/, N/',
      'Rename all files to convention: {GROUP}{SEQ}_{Name}.{ext}',
      'Verify PDF quality (run OCR test on sample page)',
      'Note any addendum dates for override ordering',
      'Identify which PC clauses override GC clauses'
    ],
    documentUpload: [
      'Upload Form of Agreement (A/) - extract contract data fields',
      'Upload LOA (B/) - extract commencement date, amounts',
      'Upload GC (C/C001) - parse all clauses',
      'Upload PC (C/C002) - parse modifications, link to GC',
      'Upload Addendums (D/) in date order - mark supersedes relationships',
      'Upload BOQ (I/) - extract as structured tables',
      'Upload Schedules/Annexes (N/) - link to referenced clauses'
    ],
    postIngestion: [
      'Run clause count validation (expected vs actual)',
      'Verify clause numbers are unique per section',
      'Check cross-reference links resolve correctly',
      'Validate addendum overrides are recorded',
      'Test search: "What is the Defects Liability Period?"',
      'Test citation: "Cite Clause 19.3 with PC modifications"'
    ],
    qualityChecks: [
      'Review low-confidence OCR chunks (< 0.8 confidence)',
      'Verify table extraction accuracy (spot check 5 BOQ rows)',
      'Confirm PC/GC comparison flags are accurate',
      'Check for duplicate chunks (same content, different IDs)'
    ]
  };
}
