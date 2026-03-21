
import { supabase } from '@/lib/supabase';

export interface LocalKnowledgeItem {
  id: string;
  name: string;
  timestamp: number;
  content: any;
}

export const localKnowledgeService = {
  /**
   * Fetches content for specific knowledge IDs from Supabase and combines
   * them into a single context string for the AI assistant.
   */
  async fetchBatchContent(ids: string[]): Promise<string> {
    if (!ids || ids.length === 0) return '';
    
    try {
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('*')
        .in('id', ids);

      if (error || !data || data.length === 0) return '';

      let combinedContext = '\n=== SELECTED KNOWLEDGE HUB SOURCES ===\n';
      
      for (const item of data) {
        combinedContext += `\n[Source: ${item.name}]\n`;
        const content = item.data;
        
        if (typeof content === 'object') {
          if (content.text) {
            const text = content.text;
            combinedContext += text.length > 8000 ? text.slice(0, 8000) + '\n[...truncated]' : text;
            combinedContext += '\n';
          } else {
            const json = JSON.stringify(content, null, 2);
            combinedContext += json.length > 8000 ? json.slice(0, 8000) + '\n[...truncated]' : json;
            combinedContext += '\n';
          }
        } else {
          const str = String(content);
          combinedContext += str.length > 8000 ? str.slice(0, 8000) + '\n[...truncated]' : str;
          combinedContext += '\n';
        }
        combinedContext += '---\n';
      }
      
      return combinedContext;
    } catch (error) {
      console.error('Local knowledge service error:', error);
      return '';
    }
  }
};
