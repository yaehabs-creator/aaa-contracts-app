import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';

/**
 * Smart PDF to JSON converter.
 * It uses pdf2json for text extraction from text-based PDFs,
 * and falls back to a PaddleOCR backend (port 8000) for scanned PDFs.
 * Finally, it parses the text into a structured JSON for contracts.
 */

async function extractTextFromPdf(pdfPath) {
    console.log(`Analyzing ${pdfPath}...`);
    let fullText = "";

    const stats = fs.statSync(pdfPath);
    // If it's a small file, try the old way first
    if (stats.size < 5 * 1024 * 1024) {
        const text = await tryPdf2Json(pdfPath);
        if (text) return text;
    }

    console.log("Using batch OCR processing...");

    let currentPage = 0;
    // Check if a starting page was provided in args
    const startPageArg = process.argv.find(a => a.startsWith('--start-page='));
    if (startPageArg) {
        currentPage = parseInt(startPageArg.split('=')[1]);
        console.log(`Starting from manually specified page: ${currentPage + 1}`);
    }

    const batchSize = 10;
    let hasMore = true;
    const intermediatePath = pdfPath.replace(/\.pdf$/i, '_intermediate.txt');

    // Always load existing progress if it exists
    if (fs.existsSync(intermediatePath)) {
        console.log("Found intermediate file. Loading existing progress...");
        fullText = fs.readFileSync(intermediatePath, 'utf8');

        // If user didn't specify a start page, try to detect it
        if (currentPage === 0) {
            const markers = fullText.match(/\[BATCH_COMPLETED_UP_TO_PAGE_(\d+)\]/g);
            if (markers) {
                const lastPage = parseInt(markers[markers.length - 1].match(/\d+/)[0]);
                currentPage = lastPage;
                console.log(`Resuming from detected page ${currentPage + 1}...`);
            }
        }
    }

    while (hasMore) {
        console.log(`Processing batch: pages ${currentPage + 1} to ${currentPage + batchSize}...`);
        try {
            const url = `http://localhost:8000/ocr-path?file_path=${encodeURIComponent(pdfPath)}&start_page=${currentPage}&limit=${batchSize}`;
            const response = await fetch(url, { method: 'POST' });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Batch OCR failed: ${errorText}`);
            }

            const data = await response.json();
            if (!data.text && data.is_last_batch) {
                hasMore = false;
                break;
            }

            fullText += data.text + `\n\n[BATCH_COMPLETED_UP_TO_PAGE_${currentPage + data.page_count}]\n\n`;
            console.log(`Completed batch. Total text length: ${fullText.length}. Progress: ${currentPage + data.page_count} / ${data.total_pages || '?'}`);

            if (data.is_last_batch || data.page_count === 0) {
                hasMore = false;
            } else {
                currentPage += data.page_count;
            }

            // Save progress every batch
            fs.writeFileSync(intermediatePath, fullText);

        } catch (error) {
            console.error(`Error in batch starting at p${currentPage + 1}:`, error.message);
            hasMore = false;
        }
    }

    return fullText;
}

async function tryPdf2Json(pdfPath) {
    const pdfParser = new PDFParser();
    return new Promise((resolve) => {
        pdfParser.on("pdfParser_dataError", () => resolve(null));
        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            let rawText = "";
            pdfData.Pages.forEach(page => {
                page.Texts.forEach(text => {
                    rawText += decodeURIComponent(text.R[0].T) + " ";
                });
                rawText += "\n";
            });
            resolve(rawText.trim() || null);
        });
        pdfParser.loadPDF(pdfPath);
    });
}

function parseContractText(text) {
    const lines = text.split('\n');
    const contract = {
        title: "",
        metadata: {},
        sections: []
    };

    let currentSection = null;
    let currentClause = null;

    // Simple regex for Section headings (e.g., "1. DEFINITIONS") and Clauses (e.g., "1.1 Definitions")
    const sectionRegex = /^(\d+)\.\s+([A-Z\s,]+)$/;
    const clauseRegex = /^(\d+\.\d+)\s+([A-Z][a-z].*)$/;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const sectionMatch = trimmed.match(sectionRegex);
        const clauseMatch = trimmed.match(clauseRegex);

        if (sectionMatch) {
            currentSection = {
                id: sectionMatch[1],
                title: sectionMatch[2].trim(),
                clauses: []
            };
            contract.sections.push(currentSection);
            currentClause = null;
        } else if (clauseMatch && currentSection) {
            currentClause = {
                id: clauseMatch[1],
                title: clauseMatch[2].trim(),
                content: ""
            };
            currentSection.clauses.push(currentClause);
        } else if (currentClause) {
            currentClause.content += trimmed + " ";
        } else if (currentSection) {
            // Content before the first clause of a section
            currentSection.intro = (currentSection.intro || "") + trimmed + " ";
        } else {
            // Project metadata or header info
            if (!contract.title && trimmed.length > 5 && trimmed.length < 100) {
                contract.title = trimmed;
            }
            contract.metadata.raw_header = (contract.metadata.raw_header || "") + trimmed + " ";
        }
    });

    return contract;
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('Usage: node scripts/converters/contract_to_json.js <path_to_pdf> [output_json]');
        process.exit(1);
    }

    const pdfPath = path.resolve(args[0]);
    const jsonPath = args[1] ? path.resolve(args[1]) : pdfPath.replace(/\.pdf$/i, '_structured.json');

    try {
        const text = await extractTextFromPdf(pdfPath);
        if (!text) throw new Error("Could not extract text from PDF");

        // Save raw text for debugging
        const rawPath = pdfPath.replace(/\.pdf$/i, '_raw.txt');
        fs.writeFileSync(rawPath, text);
        console.log(`Raw text saved to ${rawPath}`);

        const structuredData = parseContractText(text);
        fs.writeFileSync(jsonPath, JSON.stringify(structuredData, null, 2));

        console.log(`Successfully saved structured data to ${jsonPath}`);
        console.log(`Sections extracted: ${structuredData.sections.length}`);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
