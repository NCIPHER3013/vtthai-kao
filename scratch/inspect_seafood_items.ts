import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItems } = await supabase.from('stock_items').select('*');
  const seafoods = stockItems?.filter(s => s.name.toLowerCase().includes('sea') || s.name.toLowerCase().includes('prawn'));

  console.log("=== ALL SEAFOOD ITEMS IN STOCK_ITEMS ===");
  seafoods?.forEach(s => {
    console.log(`[ID: ${s.id}] Name: "${s.name}" | Category: "${s.category}" | Unit: "${s.unit}"`);
  });
}

main().catch(console.error);
