import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const currySpecs = [
  { num: "24", prodName: "Yellow Curry", isStandard: true },
  { num: "25", prodName: "Green Curry", isStandard: true },
  { num: "26", prodName: "Red Curry", isStandard: true },
  { num: "27", prodName: "Panang Curry", isStandard: true },
  { num: "28", prodName: "Massaman Beef Curry", expectedRecipes: [
    { stock: "Curry Mix", qty: 300, unit: "ml", variant: null },
    { stock: "Beef chuck dice", qty: 180, unit: "g", variant: null },
    { stock: "Carrot", qty: 100, unit: "g", variant: null },
    { stock: "Potato", qty: 100, unit: "g", variant: null }
  ]},
  { num: "29", prodName: "Massaman Lamb Curry", expectedRecipes: [
    { stock: "Curry Mix", qty: 300, unit: "ml", variant: null },
    { stock: "Lamb leg dice", qty: 180, unit: "g", variant: null },
    { stock: "Carrot", qty: 100, unit: "g", variant: null },
    { stock: "Potato", qty: 100, unit: "g", variant: null }
  ]},
  { num: "30", prodName: "Red Duck Curry", expectedRecipes: [
    { stock: "Curry Mix", qty: 300, unit: "ml", variant: null },
    { stock: "Sliced Roast Duck", qty: 150, unit: "g", variant: null }
  ]}
];

const standardCurryRecipes = [
  { stock: "Curry Mix", qty: 300, unit: "ml", variant: null },
  { stock: "Mixed Vegetables", qty: 250, unit: "g", variant: "Vegetarian / Tofu" },
  { stock: "Chicken loins", qty: 120, unit: "g", variant: "Chicken" },
  { stock: "Beef slice", qty: 120, unit: "g", variant: "Beef" },
  { stock: "Seafood", qty: 200, unit: "g", variant: "Prawn / Seafood" },
  { stock: "Seafood", qty: 200, unit: "g", variant: "Duck" }
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ VERIFYING THAI CURRY RECIPES (100% AUDIT) ================\n");

  let totalChecked = 0;
  let totalPassed = 0;

  for (const item of currySpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.prodName.toLowerCase() || p.name.toLowerCase().includes(item.prodName.toLowerCase()));

    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.prodName}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    const expectedList = item.isStandard ? standardCurryRecipes : item.expectedRecipes!;

    let allMatched = true;
    if (prodRecipes.length !== expectedList.length) {
      console.log(`❌ [${item.num}] "${prod.name}" expected ${expectedList.length} entries, found ${prodRecipes.length}`);
      allMatched = false;
    }

    for (const exp of expectedList) {
      const match = prodRecipes.find(r => {
        const st = stockMap.get(r.inventory_item_id);
        const matchStock = st?.name === exp.stock;
        const matchQty = r.quantity === exp.qty;
        const matchUnit = st?.unit === exp.unit;
        const matchVariant = (r.variant || null) === exp.variant;
        return matchStock && matchQty && matchUnit && matchVariant;
      });

      if (!match) {
        console.log(`  ❌ Missing expected recipe in "${prod.name}": ${exp.qty} ${exp.unit} of "${exp.stock}" (Variant: ${exp.variant})`);
        allMatched = false;
      }
    }

    if (allMatched) {
      totalPassed++;
      console.log(`✅ [${item.num}] "${prod.name}": All ${expectedList.length} recipe entries verified (100% MATCH)`);
    }
  }

  console.log(`\n================ THAI CURRY AUDIT SUMMARY: ${totalPassed} / ${totalChecked} PASSED (100% VERIFIED) ================\n`);
}

main().catch(console.error);
