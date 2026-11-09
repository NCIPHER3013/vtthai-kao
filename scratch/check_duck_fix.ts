import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: prod } = await supabase.from('products').select('*').eq('name', 'Stir Fried Cashew Nut').single();
  const { data: recipes } = await supabase.from('recipes').select('*').eq('product_id', prod?.id);
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  console.log(`=== RECIPES FOR ${prod?.name} ===`);
  recipes?.forEach(r => {
    const st = stockItems?.find(s => s.id === r.inventory_item_id);
    console.log(`Variant: "${r.variant || 'Base'}" -> Stock: "${st?.name}" (${r.quantity} ${st?.unit})`);
  });
}

main().catch(console.error);
