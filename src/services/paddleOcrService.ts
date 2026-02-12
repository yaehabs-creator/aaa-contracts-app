/**
 * Service to communicate with the local PaddleOCR microservice.
 */
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
    static async processFile(file: File | ArrayBuffer, fileName: string): Promise<any> {
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
}
