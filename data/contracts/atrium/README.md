# Atrium Contract Documents

Place your PDF files in this folder with the following naming convention:

## Document Groups

| Group | Prefix | Document Type | Example Filename |
|-------|--------|---------------|------------------|
| A | A001 | Form of Agreement | `A001_Form_of_Agreement.pdf` |
| B | B001 | Letter of Acceptance | `B001_Letter_of_Acceptance.pdf` |
| C | C001 | General Conditions | `C001_General_Conditions.pdf` |
| C | C002 | Particular Conditions | `C002_Particular_Conditions.pdf` |
| D | D001+ | Addendums (by date) | `D001_Addendum_01_2024-01-15.pdf` |
| I | I001 | Bill of Quantities | `I001_Bill_of_Quantities.pdf` |
| N | N001+ | Schedules/Annexes | `N001_Technical_Schedule.pdf` |

## Naming Convention

```
{GROUP}{SEQUENCE}_{DOCUMENT_NAME}[_{DATE}].pdf

Examples:
- A001_Form_of_Agreement.pdf
- B001_Letter_of_Acceptance.pdf
- C001_General_Conditions.pdf
- C002_Particular_Conditions.pdf
- D001_Addendum_01_2024-01-15.pdf
- D002_Addendum_02_2024-02-20.pdf
- I001_Bill_of_Quantities.pdf
- I002_Method_of_Measurement.pdf
- N001_Programme_Schedule.pdf
- N002_Technical_Specifications.pdf
```

## Priority Order

Documents are processed with the following priority (highest to lowest):
1. **A** - Form of Agreement (contract formation)
2. **B** - Letter of Acceptance (binding terms)
3. **D** - Addendums (override earlier documents, sorted by date)
4. **C** - Conditions of Contract (GC/PC)
5. **I** - Bill of Quantities (pricing)
6. **N** - Schedules/Annexes (technical details)

## How to Ingest

### Option 1: Using the Ingestion Script (Recommended)

Requires `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env.local` for RLS bypass.

```bash
# Basic ingestion (no embeddings)
node scripts/ingest-atrium-documents.mjs

# With OpenAI embeddings for semantic search
node scripts/ingest-atrium-documents.mjs --embeddings
```

This will:
1. Extract text from PDFs
2. Upload to Supabase Storage
3. Create document records
4. Chunk text intelligently
5. Generate embeddings for semantic search (with --embeddings flag)

### Option 2: SQL + Embeddings (Recommended if no service role key)

1. **Generate the SQL file:**
   ```bash
   node scripts/generate-document-sql.mjs
   ```
   This reads from `contract_import_debug/` text files and creates `scripts/atrium-documents-data.sql`

2. **Run the SQL in Supabase:**
   - Go to Supabase Dashboard > SQL Editor
   - Copy contents from `scripts/atrium-documents-data.sql`
   - Run the SQL to insert documents and chunks

3. **Generate embeddings for semantic search:**
   ```bash
   node scripts/generate-embeddings.mjs
   ```
   This uses OpenAI to create vector embeddings for each chunk

### Getting Service Role Key

1. Go to Supabase Dashboard > Settings > API
2. Copy the `service_role` key (keep it secret!)
3. Add to `.env.local`:
   ```
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## AI Agent Specialization

- **OpenAI Agent**: Analyzes Groups A, B, D, I, N (commercial documents)
- **Claude Agent**: Analyzes Group C (GC/PC contract conditions)

Both agents collaborate to provide comprehensive contract analysis.
