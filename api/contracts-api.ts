/**
 * Vercel Serverless Function: Contracts & Chunks API
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass Row Level Security (RLS)
 * for read operations, ensuring that whether a user is authenticated or anonymous,
 * contract data and document chunks can always be fetched and searched.
 */

import { createClient } from '@supabase/supabase-js';

interface VercelRequest {
  method: string;
  query?: Record<string, string>;
  body?: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => void;
  setHeader: (key: string, value: string) => VercelResponse;
}

function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase credentials not configured' });
  }

  // GET: List all contracts or get a single contract
  if (req.method === 'GET') {
    const contractId = req.query?.contractId;

    if (contractId) {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data);
    }

    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const contracts = (data || [])
      .filter((c: any) => c.is_deleted !== true)
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        title: row.title || row.name,
        status: row.status || 'agentic_ready',
        timestamp: row.timestamp || new Date(row.created_at).getTime(),
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

    return res.status(200).json(contracts);
  }

  // POST: Search chunks or get summary
  if (req.method === 'POST') {
    const { action = 'search', contractId, query, limit = 15, group } = req.body || {};

    if (action === 'summary') {
      let q = supabase
        .from('contract_documents')
        .select('id, document_group, name, page_count')
        .order('sequence_number', { ascending: true });

      if (contractId) q = q.eq('contract_id', contractId);

      const { data: docs, error } = await q;
      if (error) return res.status(500).json({ error: error.message });

      const groupCounts: Record<string, number> = {};
      for (const d of docs || []) {
        groupCounts[d.document_group] = (groupCounts[d.document_group] || 0) + 1;
      }

      return res.status(200).json({
        totalDocuments: docs?.length || 0,
        groupCounts,
        documents: (docs || []).map((d: any) => ({
          id: d.id,
          group: d.document_group,
          name: d.name,
          pageCount: d.page_count
        }))
      });
    }

    if (action === 'search') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Stop words removal
      const stopWords = new Set(['the', 'and', 'for', 'are', 'with', 'what', 'how', 'when', 'who', 'which', 'about', 'can', 'you', 'tell']);
      const terms = query
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 2 && !stopWords.has(t));

      const searchTerm = terms[0] || query.trim();

      let dbQuery = supabase
        .from('contract_document_chunks')
        .select(`
          id,
          content,
          clause_number,
          clause_title,
          page_number,
          contract_id,
          contract_documents (
            id,
            name,
            document_group
          )
        `);

      if (contractId) {
        dbQuery = dbQuery.eq('contract_id', contractId);
      }

      dbQuery = dbQuery.ilike('content', `%${searchTerm}%`).limit(limit);

      const { data, error } = await dbQuery;
      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json(data || []);
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
