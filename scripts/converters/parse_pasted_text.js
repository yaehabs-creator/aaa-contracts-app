import fs from 'fs';
import path from 'path';

function parseContractText(text) {
    const lines = text.split('\n');
    const contract = {
        title: "",
        project: "Mivida Gardens Project",
        employer: "Emaar Misr",
        contractor: "ATRIUM Quality Contractors",
        sections: []
    };

    let currentSection = null;
    let currentClause = null;

    // Regex for Section headings: "1. DEFINITIONS AND INTERPRETATION" or "2A. SUPERVISION CONSULTANT..."
    const sectionRegex = /^(\d+[A-Z]?)\.\s+([A-Z\s,']+)$/;
    // Regex for Clause headings: "1.1 Definitions" or "2A.1 Supervision Consultant's Powers..."
    const clauseRegex = /^(\d+[A-Z]?\.\d+)\s+([A-Z][a-z].*)$/;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip TOC-like lines (trailing numbers)
        if (/\d+$/.test(trimmed) && trimmed.length < 50 && !trimmed.includes('.')) return;

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
                content: []
            };
            currentSection.clauses.push(currentClause);
        } else if (currentClause) {
            currentClause.content.push(trimmed);
        } else if (currentSection) {
            currentSection.intro = (currentSection.intro || "") + trimmed + " ";
        } else {
            if (!contract.title && trimmed.length > 10 && trimmed.toUpperCase() === trimmed) {
                contract.title = trimmed;
            }
        }
    });

    // Post-process to join content
    contract.sections.forEach(s => {
        s.clauses.forEach(c => {
            c.content = c.content.join(' ');
        });
    });

    return contract;
}

const textFilePath = process.argv[2];
if (!textFilePath) {
    console.error("Please provide a path to a text file.");
    process.exit(1);
}

const rawText = fs.readFileSync(textFilePath, 'utf8');
const result = parseContractText(rawText);
const outPath = textFilePath.replace('.txt', '.json');
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`Saved structured JSON to ${outPath}`);
console.log(`Extracted ${result.sections.length} sections.`);
