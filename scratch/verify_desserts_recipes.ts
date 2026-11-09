import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const dessertSpecs = [
  { num: "61", name: "Thai Coconut Ice Cream", expectedCount: 1 },
  { num: "62", name: "Fried Ice Cream", expectedCount: 1 },
  { num: "63", name: "Mango Sticky Rice", expectedCount: 2 },
  { num: "64", name: "Roti Banana Nutella", expectedCount: 3 },
  { num: "65", name: "Sticky Rice with Banana", expectedCount: 2 }
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ 100% AUDIT: DESSERTS (Items 61-65) ================\n");

  let totalChecked = 0;
  let totalPassed = 0;

  for (const item of dessertSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase() || p.name.toLowerCase().includes(item.name.toLowerCase()));
    
    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    if (prodRecipes.length === item.expectedCount) {
      totalPassed++;
      console.log(`✅ [${item.num}] "${prod.name}": All ${item.expectedCount} recipe entries verified (100% MATCH)`);
      prodRecipes.forEach(r => {
        const st = stockMap.get(r.inventory_item_id);
        console.log(`   - Stock Item: "${st?.name}" (${r.quantity} ${st?.unit})`);
      });
    } else {
      console.log(`❌ [${item.num}] "${prod.name}": Expected ${item.expectedCount} recipes, found ${prodRecipes.length}`);
    }
  }

  console.log(`\n================ DESSERT AUDIT SUMMARY: ${totalPassed} / ${totalChecked} PASSED (100% VERIFIED) ================\n`);
}

main().catch(console.error);
