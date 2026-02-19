/**
 * PDF Analysis Client
 * 
 * Client-side service for analyzing PDFs directly with Claude's native PDF support.
 * Results are cached in Supabase to avoid redundant calls.
 */

interface AnalysisRequest {
    documentId: string;
    prompt: string;
    model?: string;
    forceRefresh?: boolean;
}

interface AnalysisResponse {
    cached: boolean;
    analysis: {
        response: string;
        [key: string]: any;
    };
    document_id: string;
    document_name?: string;
    model_used: string;
}

const getProxyUrl = (): string => {
    if (import.meta.env.PROD) {
        return '/api/ai-proxy-pdf';
    }
    return import.meta.env.VITE_AI_PROXY_PDF_URL || '/api/ai-proxy-pdf';
};

/**
 * Analyze a PDF document using Claude's Native PDF API.
 * Uses a caching layer in Supabase to store results.
 */
export async function analyzePDFWithClaude(request: AnalysisRequest): Promise<AnalysisResponse> {
    const url = getProxyUrl();

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            document_id: request.documentId,
            prompt: request.prompt,
            model: request.model,
            force_refresh: request.forceRefresh
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `PDF Analysis error: ${response.status}`);
    }

    return response.json();
}

/**
 * Helper: Simple Party Extraction from PDF
 */
export async function extractPartiesFromPDF(documentId: string): Promise<string> {
    const prompt = `Please analyze this contract document and extract the main parties involved (Employer/Client and Contractor/Consultant). 
  Return the names and their roles clearly.`;

    const result = await analyzePDFWithClaude({ documentId, prompt });
    return result.analysis.response;
}

/**
 * Helper: General Q&A with a PDF
 */
export async function askPDF(documentId: string, question: string): Promise<string> {
    const result = await analyzePDFWithClaude({ documentId, prompt: question });
    return result.analysis.response;
}
