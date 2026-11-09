import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const soupItemsInImage = [
  { num: "20", nameInImage: "Stream Noodle" },
  { num: "21", nameInImage: "Bangkok Ocean Volcano Noodle" },
  { num: "22", nameInImage: "Tom Yum" },
  { num: "23", nameInImage: "Tom Kha" }
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ VERIFIED SOUP & NOODLE SOUP RECIPES ================\n");

  for (const item of soupItemsInImage) {
    const prod = products?.find(p => p.name.toLowerCase() === item.nameInImage.toLowerCase());
    if (prod) {
      console.log(`### Product: "${prod.name}" (ID: ${prod.id})`);
      const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
      prodRecipes.forEach(r => {
        const st = stockMap.get(r.inventory_item_id);
        console.log(`  📜 Recipe: Stock Item = "${st ? st.name : 'Unknown'}", Qty = ${r.quantity} ${st ? st.unit : ''}, Variant = ${r.variant || 'Base'}`);
      });
    }
    console.log("------------------------------------------------------------------");
  }
}

main().catch(console.error);
