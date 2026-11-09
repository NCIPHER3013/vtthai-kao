import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  console.log("=== CHECKING STOCK ITEMS FOR CURRY INGREDIENTS ===");
  const searchTerms = ["curry", "potato", "carrot", "lamb", "duck"];

  searchTerms.forEach(term => {
    const matches = stockItems?.filter(s => s.name.toLowerCase().includes(term));
    console.log(`\nMatches for "${term}":`);
    matches?.forEach(m => console.log(`  [ID:${m.id}] "${m.name}" (Category: ${m.category}, Unit: ${m.unit})`));
  });
}

main().catch(console.error);
