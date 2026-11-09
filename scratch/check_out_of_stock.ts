import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  console.log("=== CHECKING STOCK ITEMS WITH 0 CURRENT STOCK ===");
  const zeroStock = stockItems?.filter(s => s.current_stock === 0 || s.status === 'OUT');

  console.log(`Found ${zeroStock?.length} stock items with 0 stock or status OUT:`);
  zeroStock?.forEach(s => {
    console.log(`- [ID:${s.id}] "${s.name}" (Unit: ${s.unit}, Category: ${s.category}) | Stock: ${s.current_stock} | Status: ${s.status}`);
  });
}

main().catch(console.error);
