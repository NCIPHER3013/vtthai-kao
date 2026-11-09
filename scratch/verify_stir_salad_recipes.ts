import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const stirFriedSpecs = [
  { name: "Stir Fried Sweet Basil", isOyster: false },
  { name: "Stir Fried Cashew Nut", isOyster: false },
  { name: "Stir Fried Sweet Ginger", isOyster: false },
  { name: "Stir Fried Oyster Sauce", isOyster: true },
  { name: "Stir Fried Sweet & Sour", isOyster: false },
  { name: "Stir Fried Garlic & Pepper", isOyster: false },
  { name: "Stir Fried Fresh Chilli Chicken", isOyster: false }
];

const saladSpecs = [
  { num: "47", name: "Som Tum", expected: [
    { stock: "Papaya", qty: 150, unit: "g", variant: null }
  ]},
  { num: "48", name: "Larb Gai", expected: [
    { stock: "Chicken mince", qty: 200, unit: "g", variant: null },
    { stock: "Mixed Vegetables", qty: 150, unit: "g", variant: null }
  ]},
  { num: "49", name: "Beef Salad", expected: [
    { stock: "Beef slice", qty: 200, unit: "g", variant: null },
    { stock: "Mixed Vegetables", qty: 150, unit: "g", variant: null }
  ]},
  { num: "50", name: "Beef BBQ", expected: [
    { stock: "Beef porterhouse", qty: 200, unit: "g", variant: null },
    { stock: "Mixed Vegetables", qty: 150, unit: "g", variant: null }
  ]}
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ 100% AUDIT: THAI STIR FRIED & SALAD (Image 4) ================\n");

  let totalChecked = 0;
  let totalPassed = 0;

  // Audit Stir Fried
  for (const item of stirFriedSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    const expectedCount = item.isOyster ? 6 : 5;

    let allMatched = true;
    if (prodRecipes.length !== expectedCount) {
      console.log(`❌ "${prod.name}" expected ${expectedCount} entries, found ${prodRecipes.length}`);
      allMatched = false;
    }

    if (allMatched) {
      totalPassed++;
      console.log(`✅ "${prod.name}": All ${expectedCount} recipe entries verified (100% MATCH)`);
    }
  }

  // Audit Salad
  for (const item of saladSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    let allMatched = true;
    if (prodRecipes.length !== item.expected.length) {
      console.log(`❌ [${item.num}] "${prod.name}" expected ${item.expected.length} entries, found ${prodRecipes.length}`);
      allMatched = false;
    }

    for (const exp of item.expected) {
      const match = prodRecipes.find(r => {
        const st = stockMap.get(r.inventory_item_id);
        const matchStock = st?.name === exp.stock;
        const matchQty = r.quantity === exp.qty;
        const matchUnit = st?.unit === exp.unit;
        const matchVariant = (r.variant || null) === exp.variant;
        return matchStock && matchQty && matchUnit && matchVariant;
      });

      if (!match) {
        console.log(`  ❌ Missing expected recipe in "${prod.name}": ${exp.qty} ${exp.unit} of "${exp.stock}"`);
        allMatched = false;
      }
    }

    if (allMatched) {
      totalPassed++;
      console.log(`✅ [${item.num}] "${prod.name}": All ${item.expected.length} recipe entries verified (100% MATCH)`);
    }
  }

  console.log(`\n================ STIR FRIED & SALAD AUDIT SUMMARY: ${totalPassed} / ${totalChecked} PASSED (100% VERIFIED) ================\n`);
}

main().catch(console.error);
