# Document Ingestion System - User Guide

This guide explains how to use the new Contract Document Ingestion System to upload, process, and search contract documents.

## Quick Start

### Option 1: Add Documents Tab to Your App

Add the `DocumentsManager` component to your contract view. Edit `components/ContractSectionsTabs.tsx`:

```tsx
// Add import at the top
import { DocumentsManager } from '../src/components/DocumentsManager';

// Add "DOCUMENTS" to the TabType
type TabType = SectionType | 'CONDITIONS' | 'DOCUMENTS';

// Add the Documents tab button in the tabs section
<button
  onClick={() => setActiveTab('DOCUMENTS')}
  className={`px-4 py-2 rounded-lg ${activeTab === 'DOCUMENTS' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
>
  📁 Documents
</button>

// Add the Documents tab content
{activeTab === 'DOCUMENTS' && contract.id && (
  <DocumentsManager
    contractId={contract.id}
    contractName={contract.contract_name}
    onDocumentSelect={(doc) => console.log('Selected:', doc)}
  />
)}
```

### Option 2: Use Services Directly in Code

```typescript
import { 
  DocumentUploadService,
  DocumentChunkingService,
  ClauseReferenceService,
  VectorSearchService,
  IngestionValidationService,
  runFullIngestionPipeline
} from './services/ingestionServices';

// Initialize services
const uploadService = new DocumentUploadService();
const chunkingService = new DocumentChunkingService();
const searchService = new VectorSearchService();

// Upload a document
const result = await uploadService.uploadDocument({
  contractId: 'your-contract-uuid',
  documentGroup: 'C',  // A, B, C, D, I, or N
  file: fileObject,    // File from input element
  effectiveDate: new Date()
});

// Chunk the document
const chunks = await chunkingService.chunkTextDocument(
  result.documentId,
  'your-contract-uuid',
  extractedText,
  'C',  // document group
  { extractClauses: true }
);

// Search using natural language
searchService.setOpenAIKey('your-openai-key');
const searchResults = await searchService.searchContract(
  'your-contract-uuid',
  'What are the payment terms?',
  { limit: 10, threshold: 0.7 }
);
```

## Document Groups

The system organizes documents into 6 groups following FIDIC contract structure:

| Group | Name | Description | Priority |
|-------|------|-------------|----------|
| A | Form of Agreement & Annexes | Main contract agreement | Highest |
| B | Signed LOA | Letter of Acceptance | High |
| C | Conditions of Contract | GC and PC documents | Medium-High |
| D | Addendums | Contract modifications | High (by date) |
| I | Priced BOQ | Bills of Quantities | Medium |
| N | Schedules & Appendices | Technical schedules | Lower |

## File Naming Convention

Use this naming pattern for uploaded files:

```
{GROUP}{SEQUENCE}_{DOCUMENT_NAME}.{ext}

Examples:
- A001_Form_of_Agreement.pdf
- B001_Letter_of_Acceptance.pdf
- C001_General_Conditions.pdf
- C002_Particular_Conditions.pdf
- D001_Addendum_1_Price_Adjustment.pdf
- D002_Addendum_2_Scope_Change.pdf
- I001_Bill_of_Quantities.xlsx
- N001_Technical_Schedule.pdf
```

## Complete Ingestion Pipeline

### Step 1: Upload Documents

```typescript
import { DocumentUploadService } from './services/documentUploadService';

const uploadService = new DocumentUploadService();

// Upload single document
const result = await uploadService.uploadDocument({
  contractId: contractId,
  documentGroup: 'C',
  file: pdfFile,
  effectiveDate: new Date('2024-01-15')
});

// Upload batch
const batchResult = await uploadService.uploadBatch(
  contractId,
  'D',  // Addendums group
  [file1, file2, file3],
  (progress) => console.log(`Progress: ${progress.completedFiles}/${progress.totalFiles}`)
);
```

### Step 2: Extract & Chunk Text

```typescript
import { DocumentChunkingService } from './services/documentChunkingService';

const chunkingService = new DocumentChunkingService();

// For PDF text
const chunks = await chunkingService.chunkTextDocument(
  documentId,
  contractId,
  extractedText,
  'C',
  { extractClauses: true, detectTables: true }
);

// For Excel files
const excelChunks = await chunkingService.chunkExcelDocument(
  documentId,
  contractId,
  workbookData,
  'I'
);
```

### Step 3: Detect Cross-References

```typescript
import { ClauseReferenceService } from './services/clauseReferenceService';

const refService = new ClauseReferenceService();

// Analyze entire document
const refs = await refService.analyzeDocument(contractId, documentId);

// Build reference graph
const graph = await refService.buildReferenceGraph(contractId);
```

### Step 4: Generate Embeddings (for Semantic Search)

```typescript
import { VectorSearchService } from './services/vectorSearchService';

const searchService = new VectorSearchService();
searchService.setOpenAIKey(process.env.OPENAI_API_KEY);

// Embed all chunks in a contract
const embedResult = await searchService.embedContract(
  contractId,
  (progress) => console.log(`Embedding: ${progress}%`)
);
```

### Step 5: Validate Ingestion

```typescript
import { IngestionValidationService } from './services/ingestionValidationService';

const validator = new IngestionValidationService();

// Run all validation checks
const report = await validator.validateIngestion(contractId);

if (!report.isValid) {
  console.log('Errors:', report.errors);
  console.log('Warnings:', report.warnings);
}
```

### Or: Run Full Pipeline at Once

```typescript
import { runFullIngestionPipeline } from './services/ingestionServices';

const result = await runFullIngestionPipeline(
  contractId,
  (progress, message) => {
    console.log(`${progress}%: ${message}`);
  }
);
```

## Searching Contract Documents

### Semantic Search (Natural Language)

```typescript
const searchService = new VectorSearchService();
searchService.setOpenAIKey('sk-...');

// Basic search
const results = await searchService.searchContract(
  contractId,
  'What is the defects liability period?',
  { limit: 5 }
);

// Search with filters
const filtered = await searchService.searchContract(
  contractId,
  'payment schedule',
  {
    limit: 10,
    threshold: 0.75,
    documentGroups: ['C', 'D']  // Only conditions and addendums
  }
);

// Search with context (includes cross-referenced clauses)
const contextual = await searchService.searchWithContext(
  contractId,
  'contractor obligations for site safety'
);
```

### Find Similar Clauses

```typescript
// Find clauses similar to a specific one
const similar = await searchService.findSimilarClauses(
  contractId,
  '14.1',  // clause number
  5        // max results
);
```

## Contract Priority Logic

The system automatically handles document priority:

1. **Particular Conditions override General Conditions**
2. **Later Addendums override earlier Addendums**
3. **Priority order: A > B > D > C > I > N**

Get the effective (non-overridden) version of a clause:

```typescript
import { DocumentOverrideService } from './services/documentOverrideService';

const overrideService = new DocumentOverrideService();

// Check if clause is overridden
const isOverridden = await overrideService.isClauseOverridden(
  contractId,
  '8.1'  // clause number
);

// Get effective content
const effective = await overrideService.getEffectiveClauseContent(
  contractId,
  '8.1'
);
```

## API Endpoints (for Backend Integration)

If you're building a backend API, here are the recommended endpoints:

```
POST   /api/contracts/:id/documents          - Upload document
GET    /api/contracts/:id/documents          - List all documents
GET    /api/documents/:id                    - Get document details
DELETE /api/documents/:id                    - Delete document
GET    /api/documents/:id/download           - Download file

POST   /api/contracts/:id/search             - Semantic search
POST   /api/contracts/:id/validate           - Run validation
GET    /api/contracts/:id/jobs               - Get processing jobs
GET    /api/contracts/:id/references         - Get cross-references
```

## Environment Variables

Add these to your `.env.local`:

```env
# Required for database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required for semantic search
VITE_OPENAI_API_KEY=sk-your-openai-key
```

## Troubleshooting

### "Supabase URL and key are required"
Make sure your `.env.local` has the correct Supabase credentials.

### "OpenAI API key not configured"
Set `VITE_OPENAI_API_KEY` in your environment or call `searchService.setOpenAIKey('sk-...')`.

### "relation 'contract_documents' does not exist"
Run the migration SQL in Supabase SQL Editor. See `supabase/migrations/011_contract_documents_ingestion_simple.sql`.

### Upload fails with "Storage bucket not found"
Create the storage bucket in Supabase Dashboard → Storage → New Bucket → Name: `contract-documents`.

### Embeddings not working
1. Ensure pgvector extension is enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
2. Check your OpenAI API key is valid
3. Verify chunks exist in `contract_document_chunks` table

## Checklist for Adding a New Contract

1. [ ] Create contract record in `contracts` table
2. [ ] Upload Form of Agreement (Group A)
3. [ ] Upload LOA if applicable (Group B)
4. [ ] Upload General Conditions (Group C)
5. [ ] Upload Particular Conditions (Group C)
6. [ ] Upload any Addendums (Group D) - in date order
7. [ ] Upload BOQ/Pricing documents (Group I)
8. [ ] Upload Schedules/Appendices (Group N)
9. [ ] Run validation to check for issues
10. [ ] Generate embeddings for semantic search
