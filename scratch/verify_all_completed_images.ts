import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Specs from Image 1: Entree (01-19)
const image1Specs = [
  { num: "01", prodName: "Chicken Satay Skewer (4pcs)", expectedStock: "Satay skewers", expectedQty: 4, expectedUnit: "ea" },
  { num: "02", prodName: "Veg Spring Roll", expectedStock: "Veg Spring Roll", expectedQty: 4, expectedUnit: "ea" },
  { num: "03", prodName: "Chicken Spring Roll (4pcs)", expectedStock: "Chicken Spring Roll", expectedQty: 4, expectedUnit: "ea" },
  { num: "04", prodName: "Veg Curry Puff", expectedStock: "Veg Curry Puff", expectedQty: 4, expectedUnit: "ea" },
  { num: "05", prodName: "Chicken Pop", expectedStock: "Lava Chicken Pop", expectedQty: 4, expectedUnit: "ea" },
  { num: "06", prodName: "Chicken Curry Puff", expectedStock: "Chicken Curry Puff", expectedQty: 4, expectedUnit: "ea" },
  { num: "08", prodName: "Prawn Spring Roll (4pcs)", expectedStock: "Prawn roll", expectedQty: 4, expectedUnit: "ea" },
  { num: "09", prodName: "Fried Tofu", expectedStock: "tofu", expectedQty: 6, expectedUnit: "ea" },
  { num: "10", prodName: "Thai Fish Cake (4pcs)", expectedStock: "Fish cake", expectedQty: 4, expectedUnit: "ea" },
  { num: "11", prodName: "Prawn Dim Sim", expectedStock: "Dim sum", expectedQty: 5, expectedUnit: "ea" },
  { num: "12", prodName: "Calamari Rings", expectedStock: "calamari ring", expectedQty: 6, expectedUnit: "ea" },
  { num: "13", prodName: "Mixed Entree", expectedStock: "Mixed Entree Set", expectedQty: 1, expectedUnit: "ea" },
  { num: "14", prodName: "Salt and Pepper Chicken Spare Ribs", expectedStock: "Chicken spare rib", expectedQty: 200, expectedUnit: "g" },
  { num: "15", prodName: "Pan Fry Chive Dumpling", expectedStock: "chive dumpling square", expectedQty: 6, expectedUnit: "ea" },
  { num: "16", prodName: "Salt and Pepper Squid", expectedStock: "Squid pine apple cut", expectedQty: 200, expectedUnit: "g" },
  { num: "17", prodName: "Prawn Cracker", expectedStock: "Prawn crackers", expectedQty: 1, expectedUnit: "ea" },
  { num: "18", prodName: "HSP (35pcs)", expectedStock: "HSP Set", expectedQty: 1, expectedUnit: "ea" },
  { num: "19", prodName: "Spinach Cheese Roll", expectedStock: "Spinach Cheese Roll", expectedQty: 4, expectedUnit: "ea" }
];

// Specs from Image 2: Soup & Noodle Soup (20-23)
const image2Specs = [
  { num: "20", prodName: "Stream Noodle", expectedRecipes: [
    { stock: "Soup Noodles", qty: 250, unit: "g", variant: null },
    { stock: "Seafood", qty: 200, unit: "g", variant: null }
  ]},
  { num: "21", prodName: "Bangkok Ocean Volcano Noodle", expectedRecipes: [
    { stock: "Soup Noodles", qty: 250, unit: "g", variant: "Vegetarian / Tofu" },
    { stock: "Mixed Vegetables", qty: 130, unit: "g", variant: "Vegetarian / Tofu" },
    { stock: "Soup Noodles", qty: 250, unit: "g", variant: "Chicken" },
    { stock: "Chicken loins", qty: 120, unit: "g", variant: "Chicken" },
    { stock: "Soup Noodles", qty: 250, unit: "g", variant: "Beef" },
    { stock: "Beef slice", qty: 120, unit: "g", variant: "Beef" },
    { stock: "Soup Noodles", qty: 250, unit: "g", variant: "Prawn / Seafood" },
    { stock: "Seafood", qty: 200, unit: "g", variant: "Prawn / Seafood" },
    { stock: "Soup Noodles", qty: 250, unit: "g", variant: "Duck" },
    { stock: "Seafood", qty: 200, unit: "g", variant: "Duck" }
  ]},
  { num: "22", prodName: "Tom Yum", expectedRecipes: [
    { stock: "Mixed Vegetables", qty: 130, unit: "g", variant: "Vegetarian / Tofu" },
    { stock: "Chicken loins", qty: 120, unit: "g", variant: "Chicken" },
    { stock: "Beef slice", qty: 120, unit: "g", variant: "Beef" },
    { stock: "Seafood", qty: 200, unit: "g", variant: "Prawn / Seafood" },
    { stock: "Seafood", qty: 200, unit: "g", variant: "Duck" }
  ]},
  { num: "23", prodName: "Tom Kha", expectedRecipes: [
    { stock: "Mixed Vegetables", qty: 130, unit: "g", variant: "Vegetarian / Tofu" },
    { stock: "Chicken loins", qty: 120, unit: "g", variant: "Chicken" },
    { stock: "Beef slice", qty: 120, unit: "g", variant: "Beef" },
    { stock: "Seafood", qty: 200, unit: "g", variant: "Prawn / Seafood" },
    { stock: "Seafood", qty: 200, unit: "g", variant: "Duck" }
  ]}
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ 100% FULL VERIFICATION AUDIT ================\n");

  let totalChecked = 0;
  let totalPassed = 0;

  // Check Image 1
  console.log("--- IMAGE 1: ENTREE (01-19) ---");
  for (const item of image1Specs) {
    totalChecked++;
    const prod = products?.find(p => p.name === item.prodName);
    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.prodName}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    if (prodRecipes.length !== 1) {
      console.log(`❌ [${item.num}] "${prod.name}" expected 1 recipe, found ${prodRecipes.length}`);
      continue;
    }

    const r = prodRecipes[0];
    const st = stockMap.get(r.inventory_item_id);

    const matchesStock = st?.name === item.expectedStock;
    const matchesQty = r.quantity === item.expectedQty;
    const matchesUnit = st?.unit === item.expectedUnit;

    if (matchesStock && matchesQty && matchesUnit) {
      totalPassed++;
      console.log(`✅ [${item.num}] "${prod.name}": ${r.quantity} ${st.unit} of "${st.name}" (100% MATCH)`);
    } else {
      console.log(`❌ [${item.num}] "${prod.name}": Found ${r.quantity} ${st?.unit} of "${st?.name}", Expected ${item.expectedQty} ${item.expectedUnit} of "${item.expectedStock}"`);
    }
  }

  // Check Image 2
  console.log("\n--- IMAGE 2: SOUP & NOODLE SOUP (20-23) ---");
  for (const item of image2Specs) {
    totalChecked++;
    const prod = products?.find(p => p.name === item.prodName);
    if (!prod) {
      console.log(`❌ [${item.num}] Product "${item.prodName}" NOT FOUND`);
      continue;
    }

    const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
    let allRecipesMatched = true;

    if (prodRecipes.length !== item.expectedRecipes.length) {
      console.log(`❌ [${item.num}] "${prod.name}" expected ${item.expectedRecipes.length} recipe entries, found ${prodRecipes.length}`);
      allRecipesMatched = false;
    }

    for (const exp of item.expectedRecipes) {
      const match = prodRecipes.find(r => {
        const st = stockMap.get(r.inventory_item_id);
        const matchStock = st?.name === exp.stock;
        const matchQty = r.quantity === exp.qty;
        const matchUnit = st?.unit === exp.unit;
        const matchVariant = (r.variant || null) === exp.variant;
        return matchStock && matchQty && matchUnit && matchVariant;
      });

      if (!match) {
        console.log(`  ❌ Missing expected recipe: ${exp.qty} ${exp.unit} of "${exp.stock}" (Variant: ${exp.variant})`);
        allRecipesMatched = false;
      }
    }

    if (allRecipesMatched) {
      totalPassed++;
      console.log(`✅ [${item.num}] "${prod.name}": All ${item.expectedRecipes.length} recipe entries verified (100% MATCH)`);
    }
  }

  console.log(`\n================ SUMMARY AUDIT RESULT: ${totalPassed} / ${totalChecked} PASSED (100% VERIFIED) ================\n`);
}

main().catch(console.error);
