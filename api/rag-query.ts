/**
 * Vercel Serverless Function: RAG Query
 *
 * Online semantic search + LLM answer — no Python backend needed at query time.
 *
 * Pipeline:
 *   1. Embed the user question (OpenAI text-embedding-3-small)
 *   2. Vector search in Supabase (match_document_chunks RPC)
 *   3. Build context from top-K chunks
 *   4. Ask Claude to answer using only those chunks
 *
 * POST /api/rag-query
 * Body: { contractId: string, query: string, limit?: number, threshold?: number }
 */

import { createClient } from '@supabase/supabase-js';

interface VercelRequest {
  method: string;
  body: {
    contractId: string;
    query: string;
    limit?: number;
    threshold?: number;
  };
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (key: string, value: string) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { contractId, query, limit = 15, threshold = 0.65 } = req.body || {};

  if (!contractId || !query?.trim()) {
    return res.status(400).json({ error: 'contractId and query are required' });
  }

  const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!openaiKey) return res.status(503).json({ error: 'OpenAI API key not configured' });
  if (!supabaseUrl || !supabaseKey) return res.status(503).json({ error: 'Supabase not configured' });

  try {
    // ── Step 1: Embed the query ──────────────────────────────────────────────
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query.trim()
      })
    });

    if (!embedRes.ok) {
      const err = await embedRes.json();
      return res.status(502).json({ error: `OpenAI embedding error: ${err.error?.message}` });
    }

    const embedData = await embedRes.json();
    const queryEmbedding: number[] = embedData.data[0].embedding;

    // ── Step 2: Semantic search via Supabase pgvector ────────────────────────
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: chunks, error: searchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_contract_id: contractId,
      similarity_threshold: threshold,
      match_count: limit
    });

    if (searchError) {
      console.error('RAG search error:', searchError);
      return res.status(500).json({ error: `Vector search failed: ${searchError.message}` });
    }

    if (!chunks?.length) {
      return res.status(200).json({
        response: 'No relevant sections found for your query in this contract.',
        chunks_used: 0
      });
    }

    // ── Step 3: Build context ────────────────────────────────────────────────
    const context = (chunks as any[])
      .map((c, i) => {
        const ref = c.clause_number ? `Clause ${c.clause_number}` : `Section ${i + 1}`;
        const pct = Math.round((c.similarity || 0) * 100);
        return `[${ref} | ${pct}% match]\n${c.content}`;
      })
      .join('\n\n---\n\n');

    // ── Step 4: Ask Claude ───────────────────────────────────────────────────
    if (!anthropicKey) {
      // Return raw context if no LLM key
      return res.status(200).json({ response: context, chunks_used: chunks.length });
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: [
          'You are AEhab, Senior Contract Administrator for Mivida Gardens (Employer: Emaar Misr).',
          'Answer the user question using ONLY the verified contract clauses provided.',
          'Always cite the exact governing contract clause reference on every response.',
          'If the answer is not in the provided context, say so clearly.',
          'Use plain text with emoji structure: 🔵 for sections, 🔹 for main points, 🔸 for details.'
        ].join(' '),
        messages: [{
          role: 'user',
          content: `Question: ${query}\n\nContract Sections:\n${context}`
        }]
      })
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.json();
      return res.status(502).json({ error: `Claude error: ${err.error?.message}` });
    }

    const claudeData = await claudeRes.json();
    const answer: string = claudeData.content?.[0]?.text || 'No response generated.';

    return res.status(200).json({
      response: answer,
      chunks_used: chunks.length,
      top_similarity: Math.round((chunks[0]?.similarity || 0) * 100) / 100
    });

  } catch (err: any) {
    console.error('RAG query handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
