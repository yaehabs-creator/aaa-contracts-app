/**
 * Fast Contract Explorer CLI
 * 
 * Allows AI agents or developers to quickly query and inspect large contract JSONs
 * (20MB+) without loading the entire file into an LLM context.
 * 
 * Usage:
 *   node scripts/explore_contract.js --list-pkgs
 *   node scripts/explore_contract.js --pkg PKG01 --info
 *   node scripts/explore_contract.js --pkg PKG01 --list-docs [filter]
 *   node scripts/explore_contract.js --pkg PKG01 --doc "<doc_name>"
 *   node scripts/explore_contract.js --pkg PKG01 --clause "<clause_number>"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = path.join(__dirname, '..', 'Finished Contracts');

const args = process.argv.slice(2);
const getArg = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

function loadPackageJson(pkg) {
  const filename = `${pkg.toUpperCase()} Contract.json`;
  const fullPath = path.join(CONTRACTS_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    console.error(`Package file not found: ${filename}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

// 1. List all packages
if (hasFlag('--list-pkgs') || args.length === 0) {
  const summaryPath = path.join(CONTRACTS_DIR, 'ALL_CONTRACTS_SUMMARY.json');
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    console.log(`\n=== Mivida Gardens Contract Packages (${summary.total_packages} packages, ${summary.total_documents} documents) ===\n`);
    for (const [pkg, info] of Object.entries(summary.packages)) {
      console.log(`- ${pkg}: ${info.total_documents} docs | ${info.total_clauses} clauses | ${info.file_size_mb} MB | Parties: ${info.parties.join(', ')}`);
    }
  }
  process.exit(0);
}

const pkg = getArg('--pkg');
if (!pkg) {
  console.error('Please specify a package using --pkg <PKG01..PKG15>');
  process.exit(1);
}

const data = loadPackageJson(pkg);

// 2. Package Overview / Info
if (hasFlag('--info')) {
  console.log(`\n=== ${data.contract_package} — ${data.contract_name} ===`);
  console.log(`Project: ${data.project}`);
  console.log(`Total Documents: ${data.total_documents}`);
  console.log(`Total Clauses: ${data.summary?.total_clauses}`);
  console.log(`Identified Parties: ${(data.summary?.identified_parties || []).join(', ')}`);
  console.log(`Document Breakdown:`, data.summary?.document_types_breakdown);
  process.exit(0);
}

// 3. List Documents
if (hasFlag('--list-docs')) {
  const filter = getArg('--list-docs') || '';
  const manifest = data.summary?.documents_manifest || [];
  const filtered = filter ? manifest.filter(d => 
    d.document_name.toLowerCase().includes(filter.toLowerCase()) || 
    d.document_type.toLowerCase().includes(filter.toLowerCase())
  ) : manifest;

  console.log(`\nFound ${filtered.length} documents matching "${filter}" in ${pkg}:`);
  filtered.forEach(d => {
    console.log(`[#${d.index}] ${d.document_name} | Type: ${d.document_type} | Clauses: ${d.clauses_count} | Tables: ${d.tables_count}`);
  });
  process.exit(0);
}

// 4. Retrieve specific document metadata and clauses
const docName = getArg('--doc');
if (docName) {
  const docIdx = data.documents_index?.[docName];
  if (docIdx === undefined) {
    // Try fuzzy match
    const found = (data.summary?.documents_manifest || []).find(d => 
      d.document_name.toLowerCase().includes(docName.toLowerCase())
    );
    if (!found) {
      console.error(`Document "${docName}" not found in ${pkg}`);
      process.exit(1);
    }
    const doc = data.documents[found.index];
    console.log(JSON.stringify({
      metadata: doc.document_metadata,
      clauses_count: doc.clauses?.length || 0,
      clauses: doc.clauses?.slice(0, 10),
      pages_count: doc.document_structure?.length || 0
    }, null, 2));
    process.exit(0);
  }

  const doc = data.documents[docIdx];
  console.log(JSON.stringify({
    metadata: doc.document_metadata,
    clauses_count: doc.clauses?.length || 0,
    clauses: doc.clauses?.slice(0, 10),
    pages_count: doc.document_structure?.length || 0
  }, null, 2));
  process.exit(0);
}

// 5. Retrieve specific clause by number
const clauseNum = getArg('--clause');
if (clauseNum) {
  const matched = [];
  for (const doc of data.documents || []) {
    for (const cl of doc.clauses || []) {
      const num = cl.clause_number || cl.number || '';
      if (num.toString().includes(clauseNum)) {
        matched.push({
          doc: doc.document_metadata?.document_name,
          clause_number: num,
          title: cl.clause_title || cl.title || '',
          content: cl.content || cl.text || ''
        });
      }
    }
  }

  console.log(`\nFound ${matched.length} clauses matching "${clauseNum}" in ${pkg}:`);
  matched.slice(0, 5).forEach(m => {
    console.log(`\n--- [${m.doc}] Clause ${m.clause_number}: ${m.title} ---`);
    console.log(m.content.slice(0, 400) + (m.content.length > 400 ? '...' : ''));
  });
  process.exit(0);
}
