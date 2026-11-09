import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== FIXING MIXED VEGETABLES STOCK ITEM & RECIPES ===");

  const { data: stockItems } = await supabase.from('stock_items').select('*');
  const { data: products } = await supabase.from('products').select('*');

  if (!stockItems || !products) return;

  // 1. Get or create exact "Mixed Vegetables" stock item with unit 'g'
  let mixedVeg = stockItems.find(s => s.name.toLowerCase() === "mixed vegetables" && s.unit === "g");
  if (!mixedVeg) {
    console.log("  ➕ Creating new exact Stock Item: 'Mixed Vegetables' (Unit: g)");
    const { data: created, error } = await supabase.from('stock_items').insert([{
      name: "Mixed Vegetables",
      unit: "g",
      category: "Vegetables / Fruit",
      current_stock: 10000,
      reorder_level: 1000,
      cost_per_unit: 0,
      status: "OK"
    }]).select('*').single();
    if (error) throw error;
    mixedVeg = created;
  }
  const mixedVegId = mixedVeg.id;

  // 2. Get Seafood and Soup Noodles stock IDs
  const seafoodId = stockItems.find(s => s.name === "Seafood")?.id;
  const soupNoodlesId = stockItems.find(s => s.name === "Soup Noodles")?.id;
  const chickenId = stockItems.find(s => s.name === "Chicken loins")?.id || 1622;
  const beefId = stockItems.find(s => s.name === "Beef slice")?.id || 1620;

  if (!seafoodId || !soupNoodlesId) {
    console.error("Missing Seafood or Soup Noodles stock items");
    return;
  }

  // 3. Update recipes for Tom Yum, Tom Kha, Bangkok Ocean Volcano Noodle to use "Mixed Vegetables"
  const soupProducts = ["Tom Yum", "Tom Kha", "Bangkok Ocean Volcano Noodle"];

  for (const prodName of soupProducts) {
    const prod = products.find(p => p.name.toLowerCase().includes(prodName.toLowerCase()));
    if (!prod) continue;

    // Delete current recipes
    await supabase.from('recipes').delete().eq('product_id', prod.id);

    const recipesToInsert: any[] = [];

    if (prodName === "Bangkok Ocean Volcano Noodle") {
      recipesToInsert.push(
        { product_id: prod.id, inventory_item_id: soupNoodlesId, quantity: 250, variant: "Vegetarian / Tofu" },
        { product_id: prod.id, inventory_item_id: mixedVegId, quantity: 130, variant: "Vegetarian / Tofu" },
        { product_id: prod.id, inventory_item_id: soupNoodlesId, quantity: 250, variant: "Chicken" },
        { product_id: prod.id, inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
        { product_id: prod.id, inventory_item_id: soupNoodlesId, quantity: 250, variant: "Beef" },
        { product_id: prod.id, inventory_item_id: beefId, quantity: 120, variant: "Beef" },
        { product_id: prod.id, inventory_item_id: soupNoodlesId, quantity: 250, variant: "Prawn / Seafood" },
        { product_id: prod.id, inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" },
        { product_id: prod.id, inventory_item_id: soupNoodlesId, quantity: 250, variant: "Duck" },
        { product_id: prod.id, inventory_item_id: seafoodId, quantity: 200, variant: "Duck" }
      );
    } else {
      recipesToInsert.push(
        { product_id: prod.id, inventory_item_id: mixedVegId, quantity: 130, variant: "Vegetarian / Tofu" },
        { product_id: prod.id, inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
        { product_id: prod.id, inventory_item_id: beefId, quantity: 120, variant: "Beef" },
        { product_id: prod.id, inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" },
        { product_id: prod.id, inventory_item_id: seafoodId, quantity: 200, variant: "Duck" }
      );
    }

    const { error } = await supabase.from('recipes').insert(recipesToInsert);
    if (error) {
      console.error(`Error inserting recipes for ${prodName}:`, error);
    } else {
      console.log(`✅ Updated "${prodName}" recipe to use exact "Mixed Vegetables" (130 g)`);
    }
  }

  console.log("\n=== COMPLETED FIX FOR MIXED VEGETABLES ===");
}

main().catch(console.error);
