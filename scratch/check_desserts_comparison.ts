import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const dessertDishes = [
  "Thai Coconut Ice Cream",
  "Fried Ice Cream",
  "Mango Sticky Rice",
  "Roti Banana Nutella",
  "Sticky Rice with Banana"
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ SECTION 12: DESSERTS (Items 61-65) COMPARISON ================\n");

  for (const name of dessertDishes) {
    console.log(`### Item: ${name}`);
    const prods = products?.filter(p => p.name.toLowerCase().includes(name.toLowerCase())) || [];
    if (prods.length === 0) {
      console.log(`   ❌ Product in DB: NOT FOUND`);
    } else {
      prods.forEach(prod => {
        console.log(`   📦 Product in DB: "${prod.name}" (ID: ${prod.id})`);
        const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
        if (prodRecipes.length === 0) {
          console.log(`      ⚠️ Recipe in DB: NO RECIPES linked`);
        } else {
          prodRecipes.forEach(r => {
            const st = stockMap.get(r.inventory_item_id);
            console.log(`      📜 Current Recipe: Stock Item = "${st ? st.name : 'Unknown'}" (ID: ${r.inventory_item_id}), Qty = ${r.quantity} ${st ? st.unit : ''}, Variant = ${r.variant || 'Base'}`);
          });
        }
      });
    }
    console.log("------------------------------------------------------------------");
  }
}

main().catch(console.error);
