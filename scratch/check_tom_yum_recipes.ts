import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: prod } = await supabase.from('products').select('*').eq('name', 'Tom Yum').single();
  if (!prod) return;

  const { data: recipes } = await supabase.from('recipes').select('*').eq('product_id', prod.id);
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  console.log("=== CURRENT TOM YUM RECIPES IN DB ===");
  recipes?.forEach(r => {
    const st = stockItems?.find(s => s.id === r.inventory_item_id);
    console.log(`ID: ${r.id} | Stock: "${st?.name}" (${r.inventory_item_id}) | Qty: ${r.quantity} | Variant: "${r.variant}"`);
  });
}

main().catch(console.error);
