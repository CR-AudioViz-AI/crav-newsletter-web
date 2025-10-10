import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dwglooddbagungmnapye.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function mcp__supabase__execute_sql({ query, params }: { query: string; params?: any[] }) {
  // This is a mock - in real implementation would use Supabase RPC or direct SQL
  console.log('SQL:', query, params);
  return { data: [], error: null };
}
