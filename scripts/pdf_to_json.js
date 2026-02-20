import fs from 'fs';
import path from 'path';
import PDFParser from 'pdf2json';
import { fileURLToPath } from 'url';

// Helper for ESM version of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertPdfToJson(pdfPath, jsonPath) {
    return new Promise((resolve, reject) => {
        // pdf2json is an ESM-friendly wrapper but some versions might require specific handling
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", pdfData => {
            fs.writeFileSync(jsonPath, JSON.stringify(pdfData, null, 2));
            resolve(pdfData);
        });

        pdfParser.loadPDF(pdfPath);
    });
}

const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node scripts/pdf_to_json.js <path_to_pdf> [output_json_path]');
    process.exit(1);
}

const inputPdf = path.resolve(process.cwd(), args[0]);
const outputJson = args[1] ? path.resolve(process.cwd(), args[1]) : inputPdf.replace(/\.pdf$/i, '.json');

console.log(`Converting ${inputPdf} to ${outputJson}...`);

convertPdfToJson(inputPdf, outputJson)
    .then(() => {
        console.log('Successfully converted PDF to JSON.');
    })
    .catch(err => {
        console.error('Error converting PDF:', err);
        process.exit(1);
    });
