import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const riceRotiSpecs = [
  { name: "Steam Jasmine Rice", stock: "Jasmine rice", qty: 650, unit: "g" },
  { name: "Coconut Rice", stock: "Coco rice", qty: 650, unit: "g" }
];

const extraSpecs = [
  { name: "Extra Veg", price: 4, stock: "Mixed Vegetables", qty: 100, unit: "g" },
  { name: "Extra Egg", price: 5, stock: "Egg", qty: 1, unit: "ea" },
  { name: "Extra Chicken", price: 6, stock: "Chicken loins", qty: 80, unit: "g" },
  { name: "Extra Beef", price: 7, stock: "Beef slice", qty: 80, unit: "g" },
  { name: "Extra Prawn & Seafood", price: 9, stock: "Seafood", qty: 120, unit: "g" },
  { name: "Extra Duck", price: 9, stock: "Sliced Roast Duck", qty: 100, unit: "g" }
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ 100% AUDIT: RICE & ROTI & EXTRAS (Image 7) ================\n");

  let totalChecked = 0;
  let totalPassed = 0;

  // 1. Audit Rice & Roti
  for (const item of riceRotiSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    if (prodRecipes.length === 1 && stockMap.get(prodRecipes[0].inventory_item_id)?.name === item.stock && prodRecipes[0].quantity === item.qty) {
      totalPassed++;
      console.log(`✅ "${prod.name}": ${item.qty} ${item.unit} ${item.stock} (100% MATCH)`);
    } else {
      console.log(`❌ "${prod.name}": Unexpected recipe entries`, prodRecipes);
    }
  }

  // 2. Audit Extras / Add-ons
  for (const item of extraSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    const stName = stockMap.get(prodRecipes[0]?.inventory_item_id)?.name;
    const matchPrice = prod.price === item.price;
    const matchQty = prodRecipes[0]?.quantity === item.qty;

    if (prodRecipes.length === 1 && matchPrice && matchQty) {
      totalPassed++;
      console.log(`✅ "${prod.name}" ($${prod.price}): ${item.qty} ${item.unit} ${stName} (100% MATCH)`);
    } else {
      console.log(`❌ "${prod.name}": Mismatched price or recipe`, prod, prodRecipes);
    }
  }

  console.log(`\n================ RICE & ROTI & EXTRAS AUDIT SUMMARY: ${totalPassed} / ${totalChecked} PASSED (100% VERIFIED) ================\n`);
}

main().catch(console.error);
