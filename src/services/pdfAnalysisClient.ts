/**
 * PDF Analysis Client
 * 
 * Client-side service for analyzing PDFs directly with Claude's native PDF support.
 * Sends the PDF as base64 directly to the API — no pre-existing document record needed.
 */

interface AnalysisRequest {
    file: File;
    prompt: string;
    model?: string;
    cacheKey?: string; // Optional: used to deduplicate calls for the same file+prompt
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
 * Convert a File object to a base64 string.
 */
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the Data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Analyze a PDF File using Claude's Native PDF API.
 * The file is converted to base64 client-side and sent directly.
 */
export async function analyzePDFWithClaude(request: AnalysisRequest): Promise<AnalysisResponse> {
    const url = getProxyUrl();

    // Convert File to base64
    const base64PDF = await fileToBase64(request.file);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pdf_base64: base64PDF,
            document_name: request.file.name,
            prompt: request.prompt,
            model: request.model,
            cache_key: request.cacheKey,
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
export async function extractPartiesFromPDF(file: File): Promise<string> {
    const prompt = `Please analyze this contract document and extract the main parties involved (Employer/Client and Contractor/Consultant). 
  Return the names and their roles clearly.`;

    const result = await analyzePDFWithClaude({ file, prompt });
    return result.analysis.response;
}

/**
 * Helper: General Q&A with a PDF
 */
export async function askPDF(file: File, question: string): Promise<string> {
    const result = await analyzePDFWithClaude({ file, prompt: question });
    return result.analysis.response;
}
