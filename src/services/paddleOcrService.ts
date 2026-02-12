/**
 * Service to communicate with the local PaddleOCR microservice.
 */

export interface OcrPageResult {
    page_number: number;
    text: string;
    line_count: number;
}

export interface OcrResponse {
    text: string;
    results: Array<{
        text: string;
        confidence: number;
        box: number[][];
        page?: number;
    }>;
    pages: OcrPageResult[];
    page_count: number;
    engine: string;
}

export class PaddleOcrService {
    private static readonly API_BASE = 'http://localhost:8000';
    private static isAvailable: boolean | null = null;

    /**
     * Check if the local PaddleOCR service is running.
     */
    static async checkAvailability(): Promise<boolean> {
        try {
            const response = await fetch(`${this.API_BASE}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            const data = await response.json();
            this.isAvailable = data.status === 'ok';
            return this.isAvailable;
        } catch {
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * Process a file (Image or PDF) using PaddleOCR.
     */
    static async processFile(file: File | ArrayBuffer, fileName: string): Promise<OcrResponse> {
        const formData = new FormData();

        let blob: Blob;
        if (file instanceof ArrayBuffer) {
            blob = new Blob([file]);
        } else {
            blob = file;
        }

        formData.append('file', blob, fileName);

        const response = await fetch(`${this.API_BASE}/ocr`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'PaddleOCR request failed');
        }

        return await response.json();
    }

    /**
     * Process a base64-encoded PDF using PaddleOCR and return per-page text.
     * This replaces the old pdfjsLib-based extractPagesFromPdf.
     * 
     * @param base64Data - The base64-encoded PDF data (without data: prefix)
     * @param fileName - Original filename for the PDF
     * @returns Array of strings, one per page (with "--- PAGE N ---" headers)
     */
    static async processBase64Pdf(base64Data: string, fileName?: string): Promise<string[]> {
        // Decode base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', pdfBlob, fileName || 'document.pdf');

        const response = await fetch(`${this.API_BASE}/ocr`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'PaddleOCR request failed' }));
            throw new Error(error.detail || `PaddleOCR request failed (HTTP ${response.status})`);
        }

        const data: OcrResponse = await response.json();

        // Convert per-page results to the format expected by handlePdfAnalysis:
        // Each element is a string starting with "--- PAGE N ---\n" followed by the page text
        if (data.pages && data.pages.length > 0) {
            return data.pages.map(page =>
                `--- PAGE ${page.page_number} ---\n${page.text}`
            );
        }

        // Fallback: if no pages array, return the full text as a single "page"
        return [`--- PAGE 1 ---\n${data.text}`];
    }
}
