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

    // 1. Try pdf2json first
    const pdfParser = new PDFParser();
    const textContent = await new Promise((resolve) => {
        pdfParser.on("pdfParser_dataError", () => resolve(null));
        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            let rawText = "";
            pdfData.Pages.forEach(page => {
                page.Texts.forEach(text => {
                    rawText += decodeURIComponent(text.R[0].T) + " ";
                });
                rawText += "\n";
            });
            resolve(rawText.trim());
        });
        pdfParser.loadPDF(pdfPath);
    });

    if (textContent && textContent.length > 500) {
        console.log("Extracted text using pdf2json.");
        return textContent;
    }

    // 2. Fallback to OCR backend
    console.log("PDF appears to be a scan. Falling back to OCR backend...");
    try {
        const fileBuffer = fs.readFileSync(pdfPath);
        const formData = new FormData();
        formData.append('file', new Blob([fileBuffer]), path.basename(pdfPath));

        const response = await fetch('http://localhost:8000/ocr', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`OCR backend returned ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        console.log("Extracted text using PaddleOCR.");
        return data.text;
    } catch (error) {
        console.warn("OCR backend failed:", error.message);
        return textContent || ""; // Return what we have
    }
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
