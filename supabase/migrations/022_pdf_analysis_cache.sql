-- Migration: Create PDF Analysis Cache Table
-- Description: Stores results of Claude native PDF analysis to avoid redundant API calls

CREATE TABLE IF NOT EXISTS public.pdf_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
    prompt_hash TEXT NOT NULL,
    prompt_text TEXT,
    analysis_json JSONB NOT NULL,
    model_used TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ, -- NULL means it never expires

    -- Composite unique constraint for cache lookup
    UNIQUE(document_id, prompt_hash)
);

-- Enable RLS
ALTER TABLE public.pdf_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read/write cache for documents they can access
-- Assuming contract_documents has RLS, we can check for existence of document
CREATE POLICY "Users can view cache for accessible documents" 
ON public.pdf_analysis_cache
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.contract_documents 
        WHERE id = public.pdf_analysis_cache.document_id
    )
);

CREATE POLICY "Users can insert cache for accessible documents" 
ON public.pdf_analysis_cache
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.contract_documents 
        WHERE id = public.pdf_analysis_cache.document_id
    )
);

-- Index for faster lookup
CREATE INDEX idx_pdf_cache_lookup ON public.pdf_analysis_cache(document_id, prompt_hash);
