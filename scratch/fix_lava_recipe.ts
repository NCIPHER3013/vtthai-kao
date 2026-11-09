import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: prod } = await supabase.from('products').select('*').eq('name', 'Lava Chicken Pop (4pcs)').single();
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockId = stockItems?.find(s => s.name.toLowerCase().includes('lava chicken'))?.id;

  if (prod && stockId) {
    console.log("Cleaning Lava Chicken Pop (4pcs) recipe to 4 ea Lava chicken pop...");
    await supabase.from('recipes').delete().eq('product_id', prod.id);
    await supabase.from('recipes').insert([{
      product_id: prod.id,
      inventory_item_id: stockId,
      quantity: 4,
      variant: null
    }]);
    console.log("✅ Fixed Lava Chicken Pop (4pcs) recipe!");
  }
}

main().catch(console.error);
