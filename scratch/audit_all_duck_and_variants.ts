import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const allVariantProducts = [
  "Tom Yum", "Tom Kha", "Bangkok Ocean Volcano Noodle",
  "Yellow Curry", "Green Curry", "Red Curry", "Panang Curry",
  "Stir Fried Sweet Basil", "Stir Fried Cashew Nut", "Stir Fried Sweet Ginger",
  "Stir Fried Oyster Sauce", "Stir Fried Sweet & Sour", "Stir Fried Garlic & Pepper",
  "Stir Fried Fresh Chilli Chicken"
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ AUDIT: DUCK & ALL VARIANTS ACROSS ALL DISHES ================\n");

  for (const name of allVariantProducts) {
    const prod = products?.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!prod) continue;

    console.log(`📦 "${prod.name}"`);
    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    
    prodRecipes.forEach(r => {
      const st = stockMap.get(r.inventory_item_id);
      console.log(`   - Variant: "${r.variant || 'Base'}" ➔ Stock: "${st?.name}" (${r.quantity} ${st?.unit})`);
    });
    console.log("------------------------------------------------------------------");
  }
}

main().catch(console.error);
