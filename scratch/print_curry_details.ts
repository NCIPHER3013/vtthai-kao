import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const curryNames = [
  "Yellow Curry",
  "Green Curry",
  "Red Curry",
  "Panang Curry",
  "Massaman Beef Curry",
  "Massaman Lamb Curry",
  "Red Duck Curry"
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ LIVE DB VERIFICATION FOR THAI CURRY ================\n");

  for (const name of curryNames) {
    const prod = products?.find(p => p.name.toLowerCase() === name.toLowerCase() || p.name.toLowerCase().includes(name.toLowerCase()));
    if (!prod) {
      console.log(`❌ Product "${name}" NOT FOUND`);
      continue;
    }

    console.log(`📦 Product: "${prod.name}" (ID: ${prod.id})`);
    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    
    prodRecipes.forEach(r => {
      const st = stockMap.get(r.inventory_item_id);
      console.log(`   📜 Stock: "${st?.name}" | Qty: ${r.quantity} ${st?.unit} | Variant: "${r.variant || 'Base (All)'}"`);
    });
    console.log("------------------------------------------------------------------");
  }
}

main().catch(console.error);
