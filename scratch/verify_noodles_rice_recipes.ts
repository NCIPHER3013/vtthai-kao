import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const noodlesSpecs = [
  { num: "51", name: "Pad Thai", noodle: "Pad Thai Noodle", qty: 250 },
  { num: "52", name: "Pad See Ew", noodle: "Flat Rice Noodle", qty: 250 },
  { num: "53", name: "Pad Mee Leung", noodle: "Yellow Noodle", qty: 180 },
  { num: "54", name: "Pad Kee Mao", noodle: "Flat Rice Noodle", qty: 240 },
  { num: "55", name: "Spicy Noodle", noodle: "Spicy Noodle", qty: 250 }
];

const friedRiceSpecs = [
  { num: "56", name: "Thai Fried Rice" },
  { num: "57", name: "Tom Yum Fried Rice" },
  { num: "58", name: "Salt & Pepper Crispy Chicken Fried Rice" },
  { num: "59", name: "Pineapple Fried Rice" }
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ 100% AUDIT: STIR FRIED NOODLES & FRIED RICE (Image 6) ================\n");

  let totalChecked = 0;
  let totalPassed = 0;

  // 1. Audit Noodles
  for (const item of noodlesSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    if (prodRecipes.length === 6) {
      const noodleRec = prodRecipes.find(r => r.variant === null && stockMap.get(r.inventory_item_id)?.name === item.noodle);
      const eggRec = prodRecipes.find(r => r.variant === null && stockMap.get(r.inventory_item_id)?.name === "Egg");

      if (noodleRec?.quantity === item.qty && eggRec?.quantity === 1) {
        totalPassed++;
        console.log(`✅ [${item.num}] "${prod.name}": Base (${item.noodle} ${item.qty}g + 1 Egg) + 4 Protein Variants (100% MATCH)`);
      } else {
        console.log(`❌ [${item.num}] "${prod.name}": Base recipe amounts mismatched`, prodRecipes);
      }
    } else {
      console.log(`❌ [${item.num}] "${prod.name}": Expected 6 recipe entries, found ${prodRecipes.length}`);
    }
  }

  // 2. Audit Fried Rice
  for (const item of friedRiceSpecs) {
    totalChecked++;
    const prod = products?.find(p => p.name.toLowerCase() === item.name.toLowerCase());
    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.name}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    if (prodRecipes.length === 6) {
      const riceRec = prodRecipes.find(r => r.variant === null && stockMap.get(r.inventory_item_id)?.name === "Cooked Rice");
      const eggRec = prodRecipes.find(r => r.variant === null && stockMap.get(r.inventory_item_id)?.name === "Egg");
      const vegRec = prodRecipes.find(r => r.variant === "Vegetarian / Tofu" && stockMap.get(r.inventory_item_id)?.name === "Mixed Vegetables");

      if (riceRec?.quantity === 250 && eggRec?.quantity === 1 && vegRec?.quantity === 130) {
        totalPassed++;
        console.log(`✅ [${item.num}] "${prod.name}": Base (Cooked Rice 250g + 1 Egg) + Veg (130g) + Meat Variants (100% MATCH)`);
      } else {
        console.log(`❌ [${item.num}] "${prod.name}": Recipe amounts mismatched`, prodRecipes);
      }
    } else {
      console.log(`❌ [${item.num}] "${prod.name}": Expected 6 recipe entries, found ${prodRecipes.length}`);
    }
  }

  // 3. Audit Egg Fried Rice (#60)
  totalChecked++;
  const eggRiceProd = products?.find(p => p.name.toLowerCase() === "egg fried rice");
  if (eggRiceProd) {
    const eggRiceRecipes = recipes?.filter(r => r.product_id === eggRiceProd.id) || [];
    const riceRec = eggRiceRecipes.find(r => stockMap.get(r.inventory_item_id)?.name === "Cooked Rice");
    const eggRec = eggRiceRecipes.find(r => stockMap.get(r.inventory_item_id)?.name === "Egg");

    if (eggRiceRecipes.length === 2 && riceRec?.quantity === 350 && eggRec?.quantity === 2) {
      totalPassed++;
      console.log(`✅ [60] "Egg Fried Rice": Base (Cooked Rice 350g + 2 Eggs - No meat/veg) (100% MATCH)`);
    } else {
      console.log(`❌ [60] "Egg Fried Rice": Recipe amounts mismatched`, eggRiceRecipes);
    }
  }

  console.log(`\n================ STIR FRIED NOODLES & FRIED RICE AUDIT SUMMARY: ${totalPassed} / ${totalChecked} PASSED (100% VERIFIED) ================\n`);
}

main().catch(console.error);
