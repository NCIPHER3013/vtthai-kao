import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Items from image 1. Entree (Items 01-19)
const entreeMapInImage: { num: string; nameInImage: string; expectedServe: string; note: string }[] = [
  { num: "01", nameInImage: "Chicken Satay Skewer", expectedServe: "4 pcs", note: "deduct 4 skewers" },
  { num: "02", nameInImage: "Vegetarian Spring Roll", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "03", nameInImage: "Chicken Spring Roll", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "04", nameInImage: "Vegetarian Curry Puff", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "05", nameInImage: "Lava Chicken Pop", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "06", nameInImage: "Chicken Curry Puff", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "07", nameInImage: "Curry Puff (other variety)", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "08", nameInImage: "Prawn Spring Roll", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "09", nameInImage: "Fried Tofu", expectedServe: "6 pcs", note: "deduct 6 pcs" },
  { num: "10", nameInImage: "Thai Fish Cake", expectedServe: "4 pcs", note: "deduct 4 pcs" },
  { num: "11", nameInImage: "Prawn Dim Sim", expectedServe: "5 pcs", note: "deduct 5 pcs" },
  { num: "12", nameInImage: "Calamari Rings", expectedServe: "6 pcs", note: "deduct 6 pcs" },
  { num: "13", nameInImage: "Mixed Entree", expectedServe: "7 pcs (combo)", note: "deduct 7-pc combo" },
  { num: "14", nameInImage: "Salt & Pepper Chicken Spare Ribs", expectedServe: "~8 pcs / 200 g", note: "~200 g chicken spare ribs per serve" },
  { num: "15", nameInImage: "Pan Fry Chive Dumpling", expectedServe: "as printed pcs", note: "deduct printed pcs count" },
  { num: "16", nameInImage: "Salt & Pepper Squid", expectedServe: "~8 pcs / 200 g", note: "~200 g squid per serve" },
  { num: "17", nameInImage: "Prawn Cracker", expectedServe: "serve pack", note: "1 serve pack per order" },
  { num: "18", nameInImage: "HSP (35 pcs)", expectedServe: "35 pcs combo", note: "deduct 35-pc combo" },
  { num: "19", nameInImage: "Spinach Cheese Roll", expectedServe: "as printed pcs", note: "deduct printed pcs count" }
];

async function main() {
  const { data: products } = await supabase.from('products').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  console.log("\n================ DETAILED ENTREE COMPARISON REPORT ================\n");

  for (const item of entreeMapInImage) {
    console.log(`### Item ${item.num}: ${item.nameInImage}`);
    console.log(`   - Target Spec in Image: Serve = "${item.expectedServe}", Rule = "${item.note}"`);

    // Match product in DB
    let prod = products?.find(p => p.name.toLowerCase() === item.nameInImage.toLowerCase());
    if (!prod) {
      // Fuzzy match
      if (item.nameInImage === "Vegetarian Spring Roll") prod = products?.find(p => p.name === "Veg Spring Roll");
      else if (item.nameInImage === "Vegetarian Curry Puff") prod = products?.find(p => p.name === "Veg Curry Puff");
      else if (item.nameInImage === "Lava Chicken Pop") prod = products?.find(p => p.name === "Chicken Pop" || p.name.includes("Lava"));
      else if (item.nameInImage === "Salt & Pepper Chicken Spare Ribs") prod = products?.find(p => p.name.includes("Chicken Spare Ribs"));
      else if (item.nameInImage === "Salt & Pepper Squid") prod = products?.find(p => p.name.includes("Squid"));
      else if (item.nameInImage === "HSP (35 pcs)") prod = products?.find(p => p.name.includes("HSP"));
      else {
        prod = products?.find(p => p.name.toLowerCase().includes(item.nameInImage.toLowerCase().split(' ')[0]));
      }
    }

    if (!prod) {
      console.log(`   ❌ Product status in DB: Product NOT FOUND in DB`);
    } else {
      console.log(`   📦 Product status in DB: Found Product "${prod.name}" (ID: ${prod.id})`);
      const prodRecipes = recipes?.filter(r => r.product_id === prod.id) || [];
      if (prodRecipes.length === 0) {
        console.log(`   ⚠️ Recipe status in DB: NO RECIPE linked to this product`);
      } else {
        prodRecipes.forEach(r => {
          const st = stockMap.get(r.inventory_item_id);
          console.log(`   📜 Current Recipe in DB: Stock Item = "${st ? st.name : 'Unknown'}" (ID: ${r.inventory_item_id}), Qty = ${r.quantity} ${st ? st.unit : ''}, Variant = ${r.variant || 'Base'}`);
        });
      }
    }
    console.log("------------------------------------------------------------------");
  }
}

main().catch(console.error);
