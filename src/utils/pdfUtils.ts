// Top-level imports removed for bundle optimization
// import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

/**
 * Detects if a PDF is likely scanned (image-only) by checking text content density.
 * Returns true if the average text per page is below the threshold.
 */
export async function isScannedPdf(url: string, threshold: number = 100): Promise<boolean> {
    try {
        const pdfjsLib = await import('pdfjs-dist');
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        const numPages = pdf.numPages;
        if (numPages === 0) return true;

        let totalTextLength = 0;
        // Check first 3 pages or all if less
        const pagesToCheck = Math.min(numPages, 3);

        for (let i = 1; i <= pagesToCheck; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .filter((item): item is TextItem => 'str' in item)
                .map(item => item.str)
                .join(' ');
            totalTextLength += pageText.trim().length;
        }

        const averageTextPerPage = totalTextLength / pagesToCheck;
        return averageTextPerPage < threshold;
    } catch (error) {
        console.error('Error checking if PDF is scanned:', error);
        return true; // Assume scanned on error to be safe
    }
}

export async function extractTextFromPdf(url: string, options: { onProgress?: (p: number) => void } = {}): Promise<string> {
    try {
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source inside function
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        let fullText = '';
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Filter for TextItem type (has 'str' property)
            const pageText = textContent.items
                .filter((item): item is TextItem => 'str' in item)
                .map(item => item.str)
                .join(' ');

            fullText += `[Page ${i}]\n${pageText}\n\n`;

            if (options.onProgress) {
                options.onProgress(i / numPages);
            }
        }

        return fullText;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF: ' + (error instanceof Error ? error.message : String(error)));
    }
}
