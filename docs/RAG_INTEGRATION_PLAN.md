# Contract Content Digestion & RAG Integration Plan

To enable the AI to "digest" all contract contents (PDFs, Excels, diverse sections) and make them queryable, we will implement a Retrieval-Augmented Generation (RAG) system. This ensures the AI can reference specific parts of the Form of Agreement, BOQ, Addendums, etc., without hallucinating.

## 1. Database Schema Updates (Supabase)

We need to store document metadata and their vector embeddings.

### New Tables:
1.  **`contract_documents`**
    *   `id` (UUID)
    *   `contract_id` (UUID)
    *   `name` (Text) - e.g., "A-Form of Agreement.pdf"
    *   `file_path` (Text) - Supabase Storage path
    *   `file_type` (Text) - PDF, Excel, etc.
    *   `category` (Text) - e.g., "Form of Agreement", "BOQ"
    *   `status` (Text) - 'processing', 'completed', 'error'
    *   `processed_at` (Timestamp)

2.  **`contract_document_chunks`**
    *   `id` (UUID)
    *   `document_id` (UUID)
    *   `content` (Text) - The actual text extracted
    *   `embedding` (vector(1536)) - OpenAI embedding or similar
    *   `metadata` (JSONB) - Page number, row number (for Excel)

### Extensions:
*   Enable `pgvector` extension in Supabase.

## 2. Document Storage & Ingestion

We will use **Supabase Storage** to save the raw files.

### Workflow:
1.  **Upload**: User uploads a file/folder via the UI.
2.  **Storage**: File is saved to Supabase Storage bucket `contract-docs`.
3.  **Processing (Server-Side)**:
    *   **PDFs**: Use `pdf-parse` to extract text page by page.
    *   **Excel**: Use `xlsx` to extract rows/cells as structured text.
    *   **Word**: Use `mammoth` or similar if needed.
4.  **Chunking**: Split text into semantic chunks (e.g., 500-1000 tokens).
5.  **Embedding**: Send chunks to OpenAI API (`text-embedding-3-small`) to generate vectors.
6.  **Indexing**: Save text + vectors to `contract_document_chunks`.

## 3. UI / UX Changes

1.  **Documents Tab**: A new tab in the Contract view to manage these files.
    *   Tree view matching your folder structure (A, B, C, D...).
    *   Upload button (supporting drag & drop).
    *   Status indicators (Processing, Ready).
2.  **Chat Integration**:
    *   Update the AI Chat to "include context from documents".
    *   When the user asks a question, the system searches the vector database for relevant chunks across all uploaded documents.
    *   The relevant text is injected into the prompt for Claude.

## 4. Implementation Steps

1.  **Migration**: Create tables and enable vector extension.
2.  **API Routes**:
    *   `POST /api/documents/upload`: Handle file upload and trigger processing.
    *   `POST /api/chat/retrieve`: Logic to find relevant chunks.
3.  **Frontend**: Build the `DocumentsManager` component.
4.  **Testing**: Verify "digest" capability by asking specific questions about the BOQ or Addendums.

## Recommendation for "Best Way"
We will start by building the backend infrastructure (Schema + Vectors) and a basic upload UI. This provides the most robust solution for "digesting" large amounts of complex data.
