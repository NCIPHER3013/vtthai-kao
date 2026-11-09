import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItem } = await supabase.from('stock_items').select('*').eq('name', 'Chili prawn/seafood vegie set').single();
  if (!stockItem) {
    console.log("Not found");
    return;
  }

  console.log(`Item ID: ${stockItem.id}, Name: "${stockItem.name}"`);

  const { data: recipes } = await supabase.from('recipes').select('*').eq('inventory_item_id', stockItem.id);
  console.log("Linked Recipes count:", recipes?.length || 0);
  if (recipes && recipes.length > 0) {
    const { data: products } = await supabase.from('products').select('*');
    recipes.forEach(r => {
      const p = products?.find(prod => prod.id === r.product_id);
      console.log(`  Linked to Product: "${p?.name}" (${r.product_id})`);
    });
  }
}

main().catch(console.error);
