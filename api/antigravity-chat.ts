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

// 1. searchContract
async function searchContract(contractId: string, searchQuery: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanQuery = (searchQuery || '').trim();
  if (!cleanQuery) return [];

  try {
    const { data: exactMatches, error: exactError } = await supabase
      .from('contract_document_chunks')
      .select(`
        id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `)
      .eq('contract_id', contractId)
      .or(`content.ilike.%${cleanQuery}%,clause_title.ilike.%${cleanQuery}%`)
      .limit(6);

    if (!exactError && exactMatches && exactMatches.length > 0) {
      return formatChunks(exactMatches);
    }

    const words = cleanQuery.split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return [];

    const orFilter = words.map(w => `content.ilike.%${w}%,clause_title.ilike.%${w}%`).join(',');
    const { data: keywordMatches } = await supabase
      .from('contract_document_chunks')
      .select(`
        id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `)
      .eq('contract_id', contractId)
      .or(orFilter)
      .limit(6);

    return formatChunks(keywordMatches || []);
  } catch (err) {
    console.warn('[searchContract error]:', err);
    return [];
  }
}

// 2. getClause
async function getClause(contractId: string, clauseRef: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanRef = (clauseRef || '').replace(/^(clause|sub-clause|subclause)\s+/i, '').trim();
  if (!cleanRef) return [];

  try {
    const { data, error } = await supabase
      .from('contract_document_chunks')
      .select(`
        id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `)
      .eq('contract_id', contractId)
      .or(`clause_number.eq.${cleanRef},content.ilike.%Clause ${cleanRef}%,content.ilike.%Sub-Clause ${cleanRef}%,content.ilike.%${cleanRef}.%`)
      .limit(8);

    if (error || !data) return [];

    return data.map((item: any) => {
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
  } catch (err) {
    console.warn('[getClause error]:', err);
    return [];
  }
}

// 3. getRelatedClauses
async function getRelatedClauses(contractId: string, clauseRef: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanRef = (clauseRef || '').replace(/^(clause|sub-clause)\s+/i, '').trim();

  try {
    const { data } = await supabase
      .from('contract_document_chunks')
      .select(`
        id, document_id, chunk_index, clause_number, clause_title, page_number, content, metadata,
        contract_documents:document_id ( name, document_group )
      `)
      .eq('contract_id', contractId)
      .or(`content.ilike.%Clause ${cleanRef}%,content.ilike.%Sub-Clause ${cleanRef}%`)
      .limit(5);

    return formatChunks(data || []);
  } catch (err) {
    console.warn('[getRelatedClauses error]:', err);
    return [];
  }
}

// 4. searchContractDocuments
async function searchContractDocuments(contractId: string, searchQuery: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const cleanQuery = (searchQuery || '').trim();

  try {
    let query = supabase
      .from('contract_documents')
      .select('id, name, document_group, page_count')
      .eq('contract_id', contractId);

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

export const GEMINI_TOOLS_DECLARATION = [
  {
    functionDeclarations: [
      {
        name: 'search_contract',
        description: 'Search contract documents, clauses, and Particular Conditions for specific terms, requirements, liquidated damages, or obligations.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'The search query or terms to look up in the contract (e.g. "liquidated damages", "extension of time", "sub-clause 17.7")'
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
              description: 'The clause reference number (e.g. "19.3", "17.7", "5")'
            }
          },
          required: ['clauseRef']
        }
      },
      {
        name: 'get_related_clauses',
        description: 'Retrieve clauses referenced by or relevant to another clause (e.g. Particular Condition amendments for Clause 19).',
        parameters: {
          type: 'OBJECT',
          properties: {
            clauseRef: {
              type: 'STRING',
              description: 'The clause number to find cross-references for'
            }
          },
          required: ['clauseRef']
        }
      },
      {
        name: 'search_contract_documents',
        description: 'Search the list and overview of contract documents, appendices, and schedules for the active contract package.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'The document name, appendix, or schedule title to search for'
            }
          },
          required: ['query']
        }
      }
    ]
  }
];

export const ANTIGRAVITY_CA_SYSTEM_INSTRUCTION = `You are AEhab, an intelligent and professional Contract Administrator for the Mivida Gardens project (Employer: Emaar Misr).

COMMUNICATION STYLE:
- Answer naturally, intelligently, and directly, just like Google Gemini.
- NEVER use rigid, repetitive robotic templates such as "7-STEP CONTRACTUAL INTERPRETATION SEQUENCE", "STEP 1 — FACTS", "STEP 5 — GAP: N/A", etc.
- Answer the user's question directly with clear, elegant markdown formatting (bullet points, clear paragraphs, bold text for clause names and key figures).
- Integrate clause references smoothly into your explanations (e.g., "According to Sub-Clause 19.3 of the Conditions of Contract...").
- When quoting figures, percentages, timeframes, or liability caps, quote them accurately from the retrieved contract documents.
- If a specific figure (such as a daily penalty rate or cap) is stated in an appendix or particular condition that is not in the current package, simply explain that in a natural, helpful sentence.

OPERATIONAL RULES:
1. Use your retrieval tools (search_contract, get_clause, etc.) to look up contract provisions and Particular Conditions from the database.
2. Once relevant clauses or provisions are retrieved (or if no further documents are needed), provide a comprehensive, direct, and well-structured answer.
3. Particular Conditions (Appendix A) override General Conditions in case of conflict.
4. Keep your answers direct, practical, authoritative, and easy to read.`;

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
    const { contractId, message, conversationHistory = [] } = body;

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
  conversationHistory: any[] = []
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

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const candidateModels = [
    process.env.VITE_GEMINI_MODEL,
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-flash-latest'
  ].filter(Boolean) as string[];

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

  // 1. Initial invocation: Ask Gemini with retrieval tools enabled
  const initialPayload: any = {
    contents,
    systemInstruction: {
      parts: [{ text: ANTIGRAVITY_CA_SYSTEM_INSTRUCTION }]
    },
    tools: GEMINI_TOOLS_DECLARATION,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192
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
      if (toolName === 'search_contract') {
        toolOutput = await searchContract(contractId, args.query);
      } else if (toolName === 'get_clause') {
        toolOutput = await getClause(contractId, args.clauseRef);
      } else if (toolName === 'get_related_clauses') {
        toolOutput = await getRelatedClauses(contractId, args.clauseRef);
      } else if (toolName === 'search_contract_documents') {
        toolOutput = await searchContractDocuments(contractId, args.query);
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
      maxOutputTokens: 8192
    }
  };

  const synthesisData = await callGeminiWithFallback(synthesisPayload);
  const synthParts = synthesisData.candidates?.[0]?.content?.parts || [];
  const finalText = synthParts.map((p: any) => p.text || '').filter(Boolean).join('\n\n').trim();

  return {
    response: finalText || 'Contract analysis complete based on retrieved documents.',
    toolsUsed,
    citations
  };
}
