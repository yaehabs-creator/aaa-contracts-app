import { describe, it, expect } from 'vitest';
import { supabase } from '../lib/supabase';

// Basic Supabase connectivity and table existence test

describe('Supabase Integration', () => {
  it('should connect and fetch at least one contract (or empty array)', async () => {
    const { data, error } = await supabase.from('contracts').select('*').limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it('should connect and fetch at least one knowledge item (or empty array)', async () => {
    const { data, error } = await supabase.from('knowledge_items').select('*').limit(1);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
