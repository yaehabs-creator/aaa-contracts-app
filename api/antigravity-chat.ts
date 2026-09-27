/**
 * Serverless / Backend Route: Antigravity Contract Administrator Agent
 * 
 * Communicates with the Google Gemini API using native Function Calling / Tools
 * to query the Supabase contract database directly on the server.
 * 
 * Never exposes API keys or service role keys to the browser.
 */

import { searchContract, getClause, getRelatedClauses, searchContractDocuments } from '../src/services/contractRetrievalTools';

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
1. Always use your retrieval tools (search_contract, get_clause, etc.) to look up contract provisions and Particular Conditions from the database.
2. Particular Conditions (Appendix A) override General Conditions in case of conflict.
3. Keep your answers direct, practical, and easy to read.`;

/**
 * Serverless / Express-style Handler
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractId, message, conversationHistory = [] } = req.body;

  if (!contractId || !message) {
    return res.status(400).json({ error: 'Missing contractId or message' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please add your Gemini API key to .env.local'
    });
  }

  try {
    const result = await runAntigravityAgent(apiKey, contractId, message, conversationHistory);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[Antigravity Agent Error]:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred during agent execution',
      details: error.details
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

  // Build message history
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

  // Multi-turn agent loop for tool calls (max 5 iterations)
  for (let iteration = 0; iteration < 5; iteration++) {
    const payload = {
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

    const data = await callGeminiWithFallback(payload);

    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No candidate returned from Gemini model');
    }

    const parts = candidate.content?.parts || [];
    const functionCalls = parts.filter((p: any) => !!p.functionCall);

    // If no function call, we have our final text response
    if (functionCalls.length === 0) {
      const textPart = parts.find((p: any) => !!p.text);
      return {
        response: textPart?.text || 'No response generated.',
        toolsUsed,
        citations
      };
    }

    // Add assistant's tool-call request to contents
    contents.push({
      role: 'model',
      parts
    });

    // Execute each function call against Supabase
    const toolResponses: any[] = [];
    for (const fc of functionCalls) {
      const toolName = fc.functionCall.name;
      const args = fc.functionCall.args || {};
      toolsUsed.push(toolName);

      let toolOutput: any = null;
      if (toolName === 'search_contract') {
        toolOutput = await searchContract(contractId, args.query);
      } else if (toolName === 'get_clause') {
        toolOutput = await getClause(contractId, args.clauseRef);
      } else if (toolName === 'get_related_clauses') {
        toolOutput = await getRelatedClauses(contractId, args.clauseRef);
      } else if (toolName === 'search_contract_documents') {
        toolOutput = await searchContractDocuments(contractId, args.query);
      } else {
        toolOutput = { error: `Unknown tool: ${toolName}` };
      }

      if (Array.isArray(toolOutput)) {
        citations.push(...toolOutput.slice(0, 3));
      }

      toolResponses.push({
        functionResponse: {
          name: toolName,
          response: { output: toolOutput }
        }
      });
    }

    // Add tool responses as user turn
    contents.push({
      role: 'user',
      parts: toolResponses
    });
  }

  // If tool loop reached limit, request final answer synthesis without tools
  try {
    const finalPayload = {
      contents,
      systemInstruction: {
        parts: [{ text: ANTIGRAVITY_CA_SYSTEM_INSTRUCTION + '\n\nSynthesize all retrieved contract provisions into a clear, direct, and complete response now.' }]
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192
      }
    };
    const finalData = await callGeminiWithFallback(finalPayload);
    const finalText = finalData.candidates?.[0]?.content?.parts?.find((p: any) => !!p.text)?.text;
    if (finalText) {
      return {
        response: finalText,
        toolsUsed,
        citations
      };
    }
  } catch (err: any) {
    console.warn('[Gemini Synthesis Fallback Error]:', err.message);
  }

  return {
    response: 'Contract analysis complete based on retrieved documents.',
    toolsUsed,
    citations
  };
}
