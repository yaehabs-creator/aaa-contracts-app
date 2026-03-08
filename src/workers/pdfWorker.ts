import { FileData } from '@/types';
import { DoclingService } from '@/services/doclingService';

// Web Worker for offloading heavy PDF processing

// We need an interface for the messages sent to the worker
export type WorkerMessage =
    | { type: 'START_EXTRACTION'; payload: { fileData: FileData } }
    | { type: 'START_CLEANING'; payload: { text: string } };

// Messages sent from the worker back to the main thread
export type WorkerResponse =
    | { type: 'PROGRESS'; payload: { message: string, detail: string, percent?: number } }
    | { type: 'EXTRACTION_COMPLETE'; payload: { pages: string[] } }
    | { type: 'CLEANING_COMPLETE'; payload: { cleanedText: string } }
    | { type: 'ERROR'; payload: { error: string } };

const removeHeadersFooters = (pages: string[]): string[] => {
    if (pages.length < 3) return pages;

    const headerLines: Map<string, number> = new Map();
    const footerLines: Map<string, number> = new Map();

    pages.forEach((pageText, index) => {
        const lines = pageText.split('\n');
        const headerCount = Math.max(1, Math.floor(lines.length * 0.1));
        for (let i = 0; i < headerCount; i++) {
            const line = lines[i]?.trim();
            if (line && line !== `--- PAGE ${index + 1} ---`) {
                headerLines.set(line, (headerLines.get(line) || 0) + 1);
            }
        }

        const footerCount = Math.max(1, Math.floor(lines.length * 0.1));
        for (let i = lines.length - footerCount; i < lines.length; i++) {
            const line = lines[i]?.trim();
            if (line && line !== `--- PAGE ${index + 1} ---`) {
                footerLines.set(line, (footerLines.get(line) || 0) + 1);
            }
        }
    });

    const threshold = Math.ceil(pages.length * 0.7);
    const headerPatterns = Array.from(headerLines.entries())
        .filter(([_, count]) => count >= threshold)
        .map(([line]) => line);
    const footerPatterns = Array.from(footerLines.entries())
        .filter(([_, count]) => count >= threshold)
        .map(([line]) => line);

    return pages.map((pageText, index) => {
        const lines = pageText.split('\n');
        const filteredLines = lines.filter(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('--- PAGE')) return true;
            return !headerPatterns.includes(trimmed) && !footerPatterns.includes(trimmed);
        });
        return filteredLines.join('\n');
    });
};

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    try {
        const { type, payload } = e.data;

        if (type === 'START_EXTRACTION') {
            const { fileData } = payload;

            self.postMessage({
                type: 'PROGRESS',
                payload: { message: 'Loading PDF...', detail: 'Connecting to Docling engine', percent: 5 }
            });

            // We might need to handle the HTTP request directly here since DoclingService might expect browser context
            // but fetch is available in workers

            self.postMessage({
                type: 'PROGRESS',
                payload: { message: 'Extracting text...', detail: 'GPU-accelerated OCR processing', percent: 15 }
            });

            const startTime = Date.now();

            try {
                const response = await fetch('http://localhost:8000/process/base64', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_name: fileData.name || 'document.pdf',
                        base64_data: fileData.data
                    })
                });

                if (!response.ok) {
                    throw new Error('Docling extraction failed');
                }

                const data = await response.json();
                const pages = data.pages || [data.text || ''];

                self.postMessage({
                    type: 'PROGRESS',
                    payload: { message: 'Cleaning text...', detail: 'Removing headers and footers', percent: 35 }
                });

                const cleanedPages = pages.length > 0 ? removeHeadersFooters(pages) : pages;

                self.postMessage({
                    type: 'EXTRACTION_COMPLETE',
                    payload: { pages: cleanedPages }
                });
            } catch (err: any) {
                throw new Error('Docling extraction failed: ' + err.message);
            }
        }

    } catch (error: any) {
        self.postMessage({
            type: 'ERROR',
            payload: { error: error.message || 'Worker processing failed' }
        });
    }
};
