// Top-level imports removed for bundle optimization
// import * as pdfjsLib from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

export async function extractTextFromPdf(url: string): Promise<string> {
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
        }

        return fullText;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF: ' + (error instanceof Error ? error.message : String(error)));
    }
}
