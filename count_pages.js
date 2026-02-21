import PDFParser from 'pdf2json';
import path from 'path';

const pdfPath = "Atrium Full Contract.pdf";
const pdfParser = new PDFParser();

pdfParser.on("pdfParser_dataError", err => console.error(err));
pdfParser.on("pdfParser_dataReady", pdfData => {
    console.log(`Pages: ${pdfData.Pages.length}`);
    process.exit(0);
});

console.log("Loading PDF to count pages...");
pdfParser.loadPDF(pdfPath);
