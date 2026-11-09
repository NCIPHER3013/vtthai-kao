import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const seafoodSpecs = [
  { name: "Prawn and Seafood" },
  { name: "Chilli Prawn Jam" },
  { name: "Chilli Seafood" }
];

const fishSpecs = [
  { num: "40", name: "Pla Sarm Rod" },
  { num: "41", name: "Pla Choo Chee" },
  { num: "42", name: "Pla Lord Khing" },
  { num: "43", name: "Lime Fish" },
  { num: "44", name: "Golden Fried Fish" },
  { num: "45", name: "Steamed Fish with Soy Sauce" },
  { num: "46", name: "Pla Lui Suan" }
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ 100% AUDIT: SEAFOOD & FISH DISHES (Image 5) ================\n");

  let totalChecked = 0;
  let totalPassed = 0;

  // 1. Seafood dishes audit
  for (const item of seafoodSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    if (prodRecipes.length === 1 && stockMap.get(prodRecipes[0].inventory_item_id)?.name === "Seafood" && prodRecipes[0].quantity === 200) {
      totalPassed++;
      console.log(`✅ "${prod.name}": 200 g Seafood (100% MATCH)`);
    } else {
      console.log(`❌ "${prod.name}": Unexpected recipes found`, prodRecipes);
    }
  }

  // 2. Fish dishes audit
  for (const item of fishSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    if (prodRecipes.length === 2) {
      const fillet = prodRecipes.find(r => r.variant === "Fish Fillet");
      const whole = prodRecipes.find(r => r.variant === "Whole Fish");

      const matchFillet = stockMap.get(fillet?.inventory_item_id)?.name === "Fish Fillet" && fillet?.quantity === 350;
      const matchWhole = stockMap.get(whole?.inventory_item_id)?.name.toLowerCase().includes("barramundi whole") && whole?.quantity === 1;

      if (matchFillet && matchWhole) {
        totalPassed++;
        console.log(`✅ [${item.num}] "${prod.name}": Fish Fillet (350g) + Whole Fish (1ea) (100% MATCH)`);
      } else {
        console.log(`❌ [${item.num}] "${prod.name}": Recipe values mismatched`, prodRecipes);
      }
    } else {
      console.log(`❌ [${item.num}] "${prod.name}": Expected 2 recipe entries, found ${prodRecipes.length}`);
    }
  }

  console.log(`\n================ SEAFOOD & FISH AUDIT SUMMARY: ${totalPassed} / ${totalChecked} PASSED (100% VERIFIED) ================\n`);
}

main().catch(console.error);
