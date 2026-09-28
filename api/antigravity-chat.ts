/**
 * Serverless Route: Antigravity Contract Administrator Agent
 * 
 * 100% Self-Contained Vercel Serverless Function.
 * Communicates with Google Gemini API using native Tool / Function Calling
 * to query Supabase contract documents and Particular Conditions on the server.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize server-side Supabase client with service role key if available
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Format chunk records from database
function formatChunks(rawList: any[]) {
  return rawList.map(item => ({
    chunk_id: item.id,
    document_id: item.document_id,
    document_name: item.contract_documents?.name || item.metadata?.document_type || undefined,
    document_group: item.contract_documents?.document_group || item.metadata?.group || undefined,
    clause_number: item.clause_number,
    clause_title: item.clause_title,
    page_number: item.page_number,
    content: item.content,
    metadata: item.metadata
  }));
}

interface ContractRecord {
  id: string;
  name: string;
  package: string;
  parties: string[];
  total_documents: number;
  total_clauses: number;
}

let contractsCache: ContractRecord[] | null = null;

async function getAllContractsCached(): Promise<ContractRecord[]> {
  if (contractsCache && contractsCache.length > 0) return contractsCache;
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('contracts').select('id, name, metadata');
    if (data && data.length > 0) {
      contractsCache = data.map(d => ({
        id: d.id,
        name: d.name,
        package: (d.metadata?.package || d.name || '').toUpperCase().trim(),
        parties: d.metadata?.parties || [],
        total_documents: d.metadata?.total_documents || 0,
        total_clauses: d.metadata?.total_clauses || 0
      }));
      return contractsCache;
    }
  } catch (err) {
    console.warn('[getAllContractsCached error]:', err);
  }
  return [];
}

async function resolveContractIds(targetIdOrPackage?: string, queryOrText?: string): Promise<string[]> {
  const all = await getAllContractsCached();
  if (all.length === 0) return targetIdOrPackage && targetIdOrPackage !== 'all' ? [targetIdOrPackage] : [];

  const textToAnalyze = `${targetIdOrPackage || ''} ${queryOrText || ''}`.toUpperCase();

  // If explicit "all" or cross-package query
  if (targetIdOrPackage === 'all' || /ALL\s+(CONTRACTS|PACKAGES)|COMPARE|ACROSS\s+PACKAGES/i.test(textToAnalyze)) {
    return all.map(c => c.id);
  }

  // Check if any package code is mentioned: PKG01, PKG02, PKG03, PKG04, PKG07, PKG12, PKG14, PKG15
  const matched = new Set<string>();
  for (const c of all) {
    const pkgCode = c.package.replace(/[^A-Z0-9]/g, ''); // e.g. "PKG15"
    const num = pkgCode.replace(/\D/g, ''); // "15"
    if (
      (pkgCode && textToAnalyze.includes(pkgCode)) ||
      (num && (textToAnalyze.includes(`PKG#${num}`) || textToAnalyze.includes(`PKG ${num}`) || textToAnalyze.includes(`PACKAGE ${num}`))) ||
      (targetIdOrPackage && targetIdOrPackage === c.id)
    ) {
      matched.add(c.id);
    }
  }

  if (matched.size > 0) {
    return Array.from(matched);
  }

  // Fallback to targetIdOrPackage if it matches an existing ID or package name
  const directMatch = all.find(c => c.id === targetIdOrPackage || c.package.toLowerCase() === targetIdOrPackage?.toLowerCase());
  if (directMatch) return [directMatch.id];

  return targetIdOrPackage && targetIdOrPackage !== 'all' ? [targetIdOrPackage] : all.map(c => c.id);
}

// In-memory query cache (TTL: 2 minutes) to ensure 0ms latency for repeating queries
const queryCache = new Map<string, { data: any[]; timestamp: number }>();
const QUERY_CACHE_TTL = 120 * 1000;

function getCached(key: string): any[] | null {
  const cached = queryCache.get(key);
  if (cached && (Date.now() - cached.timestamp < QUERY_CACHE_TTL)) {
    return cached.data;
  }
  return null;
}

function setCache(key: string, data: any[]) {
  queryCache.set(key, { data, timestamp: Date.now() });
  if (queryCache.size > 200) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) queryCache.delete(oldestKey);
  }
}

// 1. searchContract
async function searchContract(contractId: string, searchQuery: string, packageHint?: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanQuery = (searchQuery || '').trim();
  if (!cleanQuery) return [];

  const cacheKey = `search:${contractId}:${packageHint || ''}:${cleanQuery}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  const targetIds = await resolveContractIds(packageHint || contractId, `${cleanQuery} ${packageHint || ''}`);
  if (targetIds.length === 0) return [];

  try {
    let queryBuilder = supabase
      .from('contract_document_chunks')
      .select(`
        id, contract_id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `);

    if (targetIds.length === 1) {
      queryBuilder = queryBuilder.eq('contract_id', targetIds[0]);
    } else {
      queryBuilder = queryBuilder.in('contract_id', targetIds);
    }

    const { data: exactMatches, error: exactError } = await queryBuilder
      .or(`content.ilike.%${cleanQuery}%,clause_title.ilike.%${cleanQuery}%`)
      .limit(8);

    if (!exactError && exactMatches && exactMatches.length > 0) {
      const res = formatChunks(exactMatches);
      setCache(cacheKey, res);
      return res;
    }

    const STOP_WORDS = new Set(['what', 'which', 'where', 'when', 'about', 'contract', 'package', 'does', 'have', 'with', 'this', 'that', 'from', 'tell', 'show', 'list', 'please', 'give', 'under', 'clause', 'terms', 'conditions']);
    const words = cleanQuery.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9]/g, '')).filter(w => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()));
    if (words.length === 0) return [];

    const orFilter = words.slice(0, 3).map(w => `content.ilike.%${w}%,clause_title.ilike.%${w}%`).join(',');
    let kwQuery = supabase
      .from('contract_document_chunks')
      .select(`
        id, contract_id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `);

    if (targetIds.length === 1) {
      kwQuery = kwQuery.eq('contract_id', targetIds[0]);
    } else {
      kwQuery = kwQuery.in('contract_id', targetIds);
    }

    const { data: keywordMatches } = await kwQuery.or(orFilter).limit(8);
    const res = formatChunks(keywordMatches || []);
    setCache(cacheKey, res);
    return res;
  } catch (err) {
    console.warn('[searchContract error]:', err);
    return [];
  }
}

// 2. getClause
async function getClause(contractId: string, clauseRef: string, packageHint?: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanRef = (clauseRef || '').replace(/^(clause|sub-clause|subclause)\s+/i, '').trim();
  if (!cleanRef) return [];

  const cacheKey = `clause:${contractId}:${packageHint || ''}:${cleanRef}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  const targetIds = await resolveContractIds(packageHint || contractId, `${cleanRef} ${packageHint || ''}`);
  if (targetIds.length === 0) return [];

  try {
    // FAST PATH: Exact index match on (contract_id, clause_number) (~100ms)
    let fastQuery = supabase
      .from('contract_document_chunks')
      .select(`
        id, contract_id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `);

    if (targetIds.length === 1) {
      fastQuery = fastQuery.eq('contract_id', targetIds[0]);
    } else {
      fastQuery = fastQuery.in('contract_id', targetIds);
    }

    const { data: exactIndexed, error: exactErr } = await fastQuery
      .eq('clause_number', cleanRef)
      .limit(8);

    if (!exactErr && exactIndexed && exactIndexed.length > 0) {
      const formatted = exactIndexed.map((item: any) => {
        const docName = item.contract_documents?.name || item.metadata?.document_type || '';
        const docGroup = item.contract_documents?.document_group || item.metadata?.group || '';
        const isParticular = docGroup === 'C' && (docName.toLowerCase().includes('particular') || item.content.toLowerCase().includes('appendix a'));
        return {
          clause_reference: item.clause_number || cleanRef,
          clause_title: item.clause_title || undefined,
          content: item.content,
          document_name: docName,
          document_group: docGroup,
          page_number: item.page_number,
          particular_condition_override: isParticular ? item.content : null
        };
      });
      setCache(cacheKey, formatted);
      return formatted;
    }

    // FALLBACK: Slower text scan if clause_number wasn't explicitly populated
    let queryBuilder = supabase
      .from('contract_document_chunks')
      .select(`
        id, contract_id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `);

    if (targetIds.length === 1) {
      queryBuilder = queryBuilder.eq('contract_id', targetIds[0]);
    } else {
      queryBuilder = queryBuilder.in('contract_id', targetIds);
    }

    const { data, error } = await queryBuilder
      .or(`content.ilike.%Clause ${cleanRef}%,content.ilike.%Sub-Clause ${cleanRef}%,content.ilike.%${cleanRef}.%`)
      .limit(8);

    if (error || !data) return [];

    const fallbackFormatted = data.map((item: any) => {
      const docName = item.contract_documents?.name || item.metadata?.document_type || '';
      const docGroup = item.contract_documents?.document_group || item.metadata?.group || '';
      const isParticular = docGroup === 'C' && (docName.toLowerCase().includes('particular') || item.content.toLowerCase().includes('appendix a'));

      return {
        clause_reference: item.clause_number || cleanRef,
        clause_title: item.clause_title || undefined,
        content: item.content,
        document_name: docName,
        document_group: docGroup,
        page_number: item.page_number,
        particular_condition_override: isParticular ? item.content : null
      };
    });
    setCache(cacheKey, fallbackFormatted);
    return fallbackFormatted;
  } catch (err) {
    console.warn('[getClause error]:', err);
    return [];
  }
}

// 3. getRelatedClauses
async function getRelatedClauses(contractId: string, clauseRef: string, packageHint?: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanRef = (clauseRef || '').replace(/^(clause|sub-clause)\s+/i, '').trim();

  const targetIds = await resolveContractIds(packageHint || contractId, `${cleanRef} ${packageHint || ''}`);
  if (targetIds.length === 0) return [];

  try {
    let queryBuilder = supabase
      .from('contract_document_chunks')
      .select(`
        id, contract_id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `);

    if (targetIds.length === 1) {
      queryBuilder = queryBuilder.eq('contract_id', targetIds[0]);
    } else {
      queryBuilder = queryBuilder.in('contract_id', targetIds);
    }

    const { data } = await queryBuilder
      .or(`content.ilike.%Clause ${cleanRef}%,content.ilike.%Sub-Clause ${cleanRef}%`)
      .limit(6);

    return formatChunks(data || []);
  } catch (err) {
    console.warn('[getRelatedClauses error]:', err);
    return [];
  }
}

// 4. searchContractDocuments
async function searchContractDocuments(contractId: string, searchQuery: string, packageHint?: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanQuery = (searchQuery || '').trim();

  const targetIds = await resolveContractIds(packageHint || contractId, `${cleanQuery} ${packageHint || ''}`);
  if (targetIds.length === 0) return [];

  try {
    let query = supabase
      .from('contract_documents')
      .select('id, contract_id, name, document_group, page_count');

    if (targetIds.length === 1) {
      query = query.eq('contract_id', targetIds[0]);
    } else {
      query = query.in('contract_id', targetIds);
    }

    if (cleanQuery) {
      query = query.ilike('name', `%${cleanQuery}%`);
    }

    const { data, error } = await query.limit(10);
    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      group: d.document_group,
      page_count: d.page_count
    }));
  } catch (err) {
    console.warn('[searchContractDocuments error]:', err);
    return [];
  }
}

// 5. listAllContracts
async function listAllContracts() {
  const all = await getAllContractsCached();
  return all.map(c => ({
    package: c.package,
    contract_name: c.name,
    parties: c.parties,
    total_documents: c.total_documents,
    total_clauses: c.total_clauses
  }));
}

export const GEMINI_TOOLS_DECLARATION = [
  {
    functionDeclarations: [
      {
        name: 'search_contract',
        description: 'Search contract documents, clauses, and Particular Conditions for specific terms, requirements, liquidated damages, or obligations in a package or across all packages.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'The search query or terms to look up in the contract (e.g. "liquidated damages", "advance payment", "sub-clause 8.7", "scope of works")'
            },
            package_name: {
              type: 'STRING',
              description: 'Optional package code (e.g. "PKG15", "PKG01", "PKG02", "PKG03", "PKG04", "PKG07", "PKG12", "PKG14") or "all" to search across all contracts.'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_clause',
        description: 'Retrieve the exact verified wording of a specific clause, along with any Particular Conditions amendments in Appendix A.',
        parameters: {
          type: 'OBJECT',
          properties: {
            clauseRef: {
              type: 'STRING',
              description: 'The clause reference number (e.g. "8.7", "14.2", "4.2", "19.3")'
            },
            package_name: {
              type: 'STRING',
              description: 'Optional package code (e.g. "PKG15", "PKG01", "PKG02")'
            }
          },
          required: ['clauseRef']
        }
      },
      {
        name: 'get_related_clauses',
        description: 'Retrieve clauses referenced by or relevant to another clause (e.g. Particular Condition amendments for Clause 8 or 14).',
        parameters: {
          type: 'OBJECT',
          properties: {
            clauseRef: {
              type: 'STRING',
              description: 'The clause number to find cross-references for'
            },
            package_name: {
              type: 'STRING',
              description: 'Optional package code (e.g. "PKG15", "PKG01")'
            }
          },
          required: ['clauseRef']
        }
      },
      {
        name: 'search_contract_documents',
        description: 'Search the list and overview of contract documents, appendices, and schedules for contract packages.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'The document name, appendix, or schedule title to search for (e.g. "Letter of Acceptance", "Appendix to Tender")'
            },
            package_name: {
              type: 'STRING',
              description: 'Optional package code (e.g. "PKG15", "PKG01")'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'list_all_contracts',
        description: 'List all 8 available contract packages (PKG01, PKG02, PKG03, PKG04, PKG07, PKG12, PKG14, PKG15) in Mivida Gardens with their contractors, document counts, and summaries.',
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      }
    ]
  }
];

export const ANTIGRAVITY_CA_SYSTEM_INSTRUCTION = `You are AEhab, an intelligent, authoritative, and professional Contract Administrator for the Mivida Gardens project (Employer: Emaar Misr).

PROJECT OVERVIEW & CONTRACT PACKAGES MANIFEST:
You have complete access to the verified contract database for all 9 packages in Mivida Gardens (Employer: Emaar Misr):
- **PKG01**: Infrastructure & Buildings (Contractors: CCC, CRC, Capital) — 904 documents, 53,251 clauses.
- **PKG02**: Packages (Contractors: Hassan Allam, Orascom, Rowad, Capital) — 67 documents, 93,242 clauses.
- **PKG03**: Packages (Contractors: Innovo, Orascom, Rowad, Consultant, Contractor) — 35 documents, 4,356 clauses.
- **PKG04**: Packages (Contractors: Capital, Consultant, Contractor, Innovo, Orascom, Rowad) — 62 documents, 105,658 clauses.
- **PKG05**: Packages (Contractors: Innovo, Orascom, Rowad, Consultant, Contractor) — 37 documents, 3,440 clauses.
- **PKG07**: Packages (Contractors: Capital, Consultant, Contractor, Engineer) — 2 documents, 3,498 clauses.
- **PKG12**: Packages (Contractors: Innovo Build S, Contractor) — 1 document, 15 clauses.
- **PKG14**: Packages (Contractors: Innovo Build S, Contractor) — 2 documents, 2,188 clauses.
- **PKG15**: Secondary Gates Buildings and Fences Walls (Contractor: Capital for Construction) — 1 document (LoA dated 31 August 2026):
  * Contract Sum: EGP 116,357,194.00 (Re-measured)
  * Time for Completion: 240 Calendar Days from Commencement Date
  * Performance Bond: 10% of Contract Sum (Unconditional Bank Guarantee, Appendix B)
  * Advance Payment: 10% of Contract Sum (Unconditional Bank Guarantee, Appendix C)
  * Retention: 5% of Interim Payment Certificates
  * Price Adjustment Base Rates: Diesel = 20.50 L.E./L, USD = 50.00 L.E./USD, Cement = 3,500 L.E./Ton, Rebar = 35,000 L.E./Ton

COMMUNICATION STYLE & SPEED RULES:
- Provide the direct contractual conclusion in the first 1-2 sentences (Bottom Line Up Front / BLUF).
- Answer naturally, intelligently, and directly, just like Google Gemini.
- NEVER use rigid, robotic step-by-step templates such as "7-STEP CONTRACTUAL INTERPRETATION SEQUENCE", "STEP 1 — FACTS", etc.
- Answer the user's inquiry directly using clean markdown formatting (bullet points, clear paragraphs, bold clause references and figures).
- Seamlessly integrate clause references and contractual provisions (e.g. Sub-Clause 8.7 Delay Damages, Appendix to Tender, LoA provisions).
- Quote figures, percentages, timeframes, and caps accurately from the verified database.
- If a figure or rate is specified in another document not currently loaded, explain that in a natural, helpful sentence.
- Eliminate filler openings ("I hope this helps", "As an AI...").

OPERATIONAL RULES:
1. Use your retrieval tools (search_contract, get_clause, list_all_contracts, etc.) or pre-fetched database clauses to look up contract provisions and Particular Conditions.
2. Particular Conditions (Appendix A) and Letter of Acceptance (LoA) override General Conditions in case of conflict.
3. Keep your answers direct, practical, authoritative, and easy to read.`;

/**
 * Serverless / Express-style Handler
 */
export default async function handler(req: any, res: any) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).json({ ok: true });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { contractId, message, conversationHistory = [], stream = false } = body;

    if (!message) {
      return res.status(400).json({ error: 'Missing message parameter' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please add GEMINI_API_KEY to your Vercel Project Settings > Environment Variables.'
      });
    }

    const targetContract = contractId || 'pkg01';

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const result = await runAntigravityAgent(
        apiKey,
        targetContract,
        message,
        conversationHistory,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      );
      res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
      return res.end();
    }

    const result = await runAntigravityAgent(apiKey, targetContract, message, conversationHistory);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Antigravity Agent Fatal Error]:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred during agent execution'
    });
  }
}

/**
 * Execute Antigravity Agent with Function Calling Loop
 */
export async function runAntigravityAgent(
  apiKey: string,
  contractId: string,
  userMessage: string,
  conversationHistory: any[] = [],
  onChunk?: (chunk: string) => void
): Promise<{ response: string; toolsUsed: string[]; citations: any[] }> {
  const toolsUsed: string[] = [];
  const citations: any[] = [];

  const contents: any[] = [];

  for (const m of conversationHistory) {
    const role = (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user';
    contents.push({
      role,
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
    });
  }

  // Fast Pre-fetch RAG: Check if user query has specific clause or keyword match in Supabase
  let prefetchEvidence = '';
  try {
    const clauseMatch = userMessage.match(/(?:clause|sub-clause|subclause)\s*([0-9]+(?:\.[0-9]+)*)/i);
    let chunks: any[] = [];
    if (clauseMatch) {
      chunks = await getClause(contractId, clauseMatch[1]);
    }
    if (chunks.length === 0 && userMessage.trim().length > 5) {
      chunks = await searchContract(contractId, userMessage);
    }
    if (chunks && chunks.length > 0) {
      const topChunks = chunks.slice(0, 5);
      prefetchEvidence = '\n\n[RELEVANT CONTRACT CLAUSES RETRIEVED FROM DATABASE]:\n' + 
        topChunks.map(c => `• [${c.document_name || 'Document'} | Clause ${c.clause_reference || c.clause_number || ''}]: ${c.content}`).join('\n\n');
      toolsUsed.push('database_prefetch_rag');
    }
  } catch (prefetchErr) {
    // Non-blocking prefetch failure
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage + prefetchEvidence }]
  });

  const candidateModels = Array.from(new Set([
    process.env.VITE_GEMINI_MODEL || 'gemini-flash-lite-latest',
    'gemini-flash-lite-latest',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.7-flash'
  ].filter(Boolean) as string[]));

  const callGeminiWithFallback = async (payload: any) => {
    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.candidates?.[0]) {
          return data;
        }
        const errMessage = data.error?.message || `HTTP ${res.status}`;
        console.warn(`[Gemini Agent] Model ${model} failed (${res.status}): ${errMessage}. Trying fallback...`);
        lastError = new Error(errMessage);
      } catch (err: any) {
        console.warn(`[Gemini Agent] Fetch error for ${model}:`, err.message);
        lastError = err;
      }
    }
    throw lastError || new Error('All Gemini candidate models failed.');
  };

  const callGeminiStreamWithFallback = async (payload: any, chunkCb: (chunk: string) => void) => {
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok || !res.body) continue;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullText += text;
                  chunkCb(text);
                }
              } catch {}
            }
          }
        }
        if (fullText) return fullText;
      } catch (err: any) {
        console.warn(`[Gemini Stream] Error for ${model}:`, err.message);
      }
    }
    return null;
  };

  // 1. Initial invocation: Ask Gemini with retrieval tools enabled
  const initialPayload: any = {
    contents,
    systemInstruction: {
      parts: [{ text: ANTIGRAVITY_CA_SYSTEM_INSTRUCTION }]
    },
    tools: GEMINI_TOOLS_DECLARATION,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3072
    }
  };

  const initialData = await callGeminiWithFallback(initialPayload);
  const candidate = initialData.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidate returned from Gemini model');
  }

  const parts = candidate.content?.parts || [];
  const functionCalls = parts.filter((p: any) => !!p.functionCall);

  // If Gemini answered directly without tools (e.g. greetings or general queries)
  if (functionCalls.length === 0) {
    const directText = parts.map((p: any) => p.text || '').filter(Boolean).join('\n\n').trim();
    if (directText) {
      if (onChunk) onChunk(directText);
      return {
        response: directText,
        toolsUsed,
        citations
      };
    }
  }

  // 2. Execute all retrieval tools returned by Gemini
  const evidenceItems: string[] = [];

  for (const fc of functionCalls) {
    const toolName = fc.functionCall.name;
    const args = fc.functionCall.args || {};
    toolsUsed.push(toolName);

    let toolOutput: any = null;
    try {
      const pkgHint = args.package_name || undefined;
      if (toolName === 'search_contract') {
        toolOutput = await searchContract(contractId, args.query, pkgHint);
      } else if (toolName === 'get_clause') {
        toolOutput = await getClause(contractId, args.clauseRef, pkgHint);
      } else if (toolName === 'get_related_clauses') {
        toolOutput = await getRelatedClauses(contractId, args.clauseRef, pkgHint);
      } else if (toolName === 'search_contract_documents') {
        toolOutput = await searchContractDocuments(contractId, args.query, pkgHint);
      } else if (toolName === 'list_all_contracts') {
        toolOutput = await listAllContracts();
      }
    } catch (err: any) {
      console.warn(`[Tool ${toolName} execution error]:`, err.message);
    }

    if (Array.isArray(toolOutput) && toolOutput.length > 0) {
      citations.push(...toolOutput.slice(0, 4));
      for (const item of toolOutput) {
        const title = item.clause_title || item.name || item.clause_reference || 'Contract Provision';
        const doc = item.document_name ? ` (${item.document_name})` : '';
        const body = item.content || JSON.stringify(item);
        evidenceItems.push(`### ${title}${doc}\n${body}`);
      }
    }
  }

  // 3. Synthesize the final answer using the retrieved contract evidence
  const evidenceText = evidenceItems.length > 0
    ? `\n\n[VERIFIED CONTRACT EVIDENCE RETRIEVED FROM DATABASE]:\n${evidenceItems.join('\n\n')}\n\nBased strictly on the verified contract documents and evidence above, provide your clear, authoritative, and direct response now.`
    : `\n\n[DATABASE SEARCH NOTE]: No specific clauses matching the query were found in package ${contractId}. Explain this clearly and guide the user on which document or appendix to reference.`;

  const synthesisContents = [
    ...contents.slice(0, -1),
    {
      role: 'user',
      parts: [{ text: userMessage + evidenceText }]
    }
  ];

  const synthesisPayload = {
    contents: synthesisContents,
    systemInstruction: {
      parts: [{ text: ANTIGRAVITY_CA_SYSTEM_INSTRUCTION }]
    },
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 3072
    }
  };

  let finalText = '';
  if (onChunk) {
    const streamedText = await callGeminiStreamWithFallback(synthesisPayload, onChunk);
    if (streamedText) {
      finalText = streamedText;
    }
  }

  if (!finalText) {
    const synthesisData = await callGeminiWithFallback(synthesisPayload);
    const synthParts = synthesisData.candidates?.[0]?.content?.parts || [];
    finalText = synthParts.map((p: any) => p.text || '').filter(Boolean).join('\n\n').trim();
    if (onChunk && finalText) onChunk(finalText);
  }

  return {
    response: finalText || 'Contract analysis complete based on retrieved documents.',
    toolsUsed,
    citations
  };
}
