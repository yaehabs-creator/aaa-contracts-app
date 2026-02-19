/**
 * PDF Analysis Client
 *
 * Uploads the PDF to Supabase Storage first, then passes the public URL
 * to the server-side Claude API — no large payloads, no 413 errors.
 */


interface AnalysisRequest {
    file: File;
    prompt: string;
    model?: string;
    storagePath: string;  // Where the file has already been uploaded
    publicUrl: string;    // Public URL from Supabase Storage
}

interface AnalysisResponse {
    cached: boolean;
    analysis: {
        response: string;
        [key: string]: any;
    };
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
 * Analyze a PDF using Claude's Native PDF API.
 * Passes the public Supabase Storage URL to the backend instead of base64.
 */
export async function analyzePDFWithClaude(request: AnalysisRequest): Promise<AnalysisResponse> {
    const url = getProxyUrl();

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pdf_url: request.publicUrl,
            document_name: request.file.name,
            prompt: request.prompt,
            model: request.model,
            cache_key: `${request.storagePath}-${request.prompt.slice(0, 50)}`,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `PDF Analysis error: ${response.status}`);
    }

    return response.json();
}

/**
 * Helper: Extract parties from PDF
 */
export async function extractPartiesFromPDF(file: File, storagePath: string, publicUrl: string): Promise<string> {
    const result = await analyzePDFWithClaude({
        file,
        storagePath,
        publicUrl,
        prompt: `Please analyze this contract document and extract the main parties involved (Employer/Client and Contractor/Consultant). Return the names and their roles clearly.`
    });
    return result.analysis.response;
}

/**
 * Helper: General Q&A with a PDF
 */
export async function askPDF(file: File, storagePath: string, publicUrl: string, question: string): Promise<string> {
    const result = await analyzePDFWithClaude({ file, storagePath, publicUrl, prompt: question });
    return result.analysis.response;
}
