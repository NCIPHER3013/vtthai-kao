import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  console.log("=== CHECKING NOODLE, RICE, EGG STOCK ITEMS ===");
  const searchTerms = ['noodle', 'rice', 'egg', 'pad thai', 'flat'];
  const matches = stockItems?.filter(s => searchTerms.some(t => s.name.toLowerCase().includes(t)));

  matches?.forEach(m => console.log(`[ID:${m.id}] Name: "${m.name}" | Category: "${m.category}" | Unit: "${m.unit}"`));
}

main().catch(console.error);
