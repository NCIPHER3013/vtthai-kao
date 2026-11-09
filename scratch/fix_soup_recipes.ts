import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING SOUP & NOODLE SOUP RECIPE FIXES (Image 2) ===");

  // Fetch products & stock items
  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  if (!products || !stockItems) {
    console.error("Failed to load initial data");
    return;
  }

  // Helper to ensure stock item exists with unit 'g'
  async function getOrCreateStockItem(name: string, category: string = 'Seafood'): Promise<number> {
    const existing = stockItems.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.unit !== 'g') {
        console.log(`  Updating unit of Stock Item "${existing.name}" (ID: ${existing.id}) to 'g'`);
        await supabase.from('stock_items').update({ unit: 'g' }).eq('id', existing.id);
      }
      return existing.id;
    }

    console.log(`  ➕ Creating missing Stock Item "${name}" (Unit: g)`);
    const { data: newStock, error } = await supabase.from('stock_items').insert([{
      name,
      unit: 'g',
      category,
      current_stock: 10000,
      reorder_level: 1000,
      cost_per_unit: 0,
      status: 'OK'
    }]).select('*').single();

    if (error) {
      console.error(`Error creating stock item ${name}:`, error);
      throw error;
    }
    return newStock.id;
  }

  // Get or create missing stock items
  const seafoodId = await getOrCreateStockItem("Seafood", "Seafood");
  const soupNoodlesId = await getOrCreateStockItem("Soup Noodles", "Dry Goods");

  // Find existing stock item IDs
  const chickenId = stockItems.find(s => s.name === "Chicken loins")?.id || 1622;
  const beefId = stockItems.find(s => s.name === "Beef slice")?.id || 1620;
  const vegId = stockItems.find(s => s.name === "Fried rice/noodle vegie")?.id || 1656;

  // Helper to clear and set recipes for a product
  async function setSoupRecipes(productName: string, recipeEntries: { inventory_item_id: number; quantity: number; variant: string | null }[]) {
    const prod = products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
    if (!prod) {
      console.error(`❌ Product "${productName}" not found in DB`);
      return;
    }

    // 1. Delete all existing recipes for this product
    const { error: delErr } = await supabase.from('recipes').delete().eq('product_id', prod.id);
    if (delErr) {
      console.error(`Error clearing recipes for ${productName}:`, delErr);
      return;
    }

    // 2. Insert new clean recipes
    const payload = recipeEntries.map(entry => ({
      product_id: prod.id,
      inventory_item_id: entry.inventory_item_id,
      quantity: entry.quantity,
      variant: entry.variant
    }));

    const { error: insErr } = await supabase.from('recipes').insert(payload);
    if (insErr) {
      console.error(`Error inserting recipes for ${productName}:`, insErr);
    } else {
      console.log(`✅ Successfully updated recipes for "${prod.name}" (${payload.length} variants/entries set)`);
    }
  }

  // ------------ APPLY FIXES FOR IMAGE 2 ------------

  // 1. Stream Noodle (fixeddish: 250g noodles + 200g seafood)
  await setSoupRecipes("Stream Noodle", [
    { inventory_item_id: soupNoodlesId, quantity: 250, variant: null },
    { inventory_item_id: seafoodId, quantity: 200, variant: null }
  ]);

  // 2. Bangkok Ocean Volcano Noodle
  await setSoupRecipes("Bangkok Ocean Volcano Noodle", [
    // Vegetarian / Tofu: 250g noodles + 130g veg
    { inventory_item_id: soupNoodlesId, quantity: 250, variant: "Vegetarian / Tofu" },
    { inventory_item_id: vegId, quantity: 130, variant: "Vegetarian / Tofu" },

    // Chicken: 250g noodles + 120g chicken
    { inventory_item_id: soupNoodlesId, quantity: 250, variant: "Chicken" },
    { inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },

    // Beef: 250g noodles + 120g beef
    { inventory_item_id: soupNoodlesId, quantity: 250, variant: "Beef" },
    { inventory_item_id: beefId, quantity: 120, variant: "Beef" },

    // Prawn / Duck / Seafood: 250g noodles + 200g seafood
    { inventory_item_id: soupNoodlesId, quantity: 250, variant: "Prawn / Seafood" },
    { inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" },
    { inventory_item_id: soupNoodlesId, quantity: 250, variant: "Duck" },
    { inventory_item_id: seafoodId, quantity: 200, variant: "Duck" }
  ]);

  // 3. Tom Yum (no broth deduction, no base veg, strictly by variant)
  await setSoupRecipes("Tom Yum", [
    { inventory_item_id: vegId, quantity: 130, variant: "Vegetarian / Tofu" },
    { inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
    { inventory_item_id: beefId, quantity: 120, variant: "Beef" },
    { inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" },
    { inventory_item_id: seafoodId, quantity: 200, variant: "Duck" }
  ]);

  // 4. Tom Kha (no broth deduction, no base veg, strictly by variant)
  await setSoupRecipes("Tom Kha", [
    { inventory_item_id: vegId, quantity: 130, variant: "Vegetarian / Tofu" },
    { inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
    { inventory_item_id: beefId, quantity: 120, variant: "Beef" },
    { inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" },
    { inventory_item_id: seafoodId, quantity: 200, variant: "Duck" }
  ]);

  console.log("\n=== SOUP & NOODLE SOUP RECIPE FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
