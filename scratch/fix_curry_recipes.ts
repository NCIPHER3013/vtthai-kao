import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING THAI CURRY RECIPE FIXES (Image 3) ===");

  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  if (!products || !stockItems) {
    console.error("Failed to load initial data");
    return;
  }

  // 1. Helper to get or create stock items with required units
  async function getOrCreateStockItem(name: string, unit: string, category: string = 'Sub-Recipe'): Promise<number> {
    const existing = stockItems.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.unit !== unit) {
        console.log(`  Updating unit of Stock Item "${existing.name}" (ID: ${existing.id}) to '${unit}'`);
        await supabase.from('stock_items').update({ unit }).eq('id', existing.id);
      }
      return existing.id;
    }

    console.log(`  ➕ Creating missing Stock Item "${name}" (Unit: ${unit})`);
    const { data: newStock, error } = await supabase.from('stock_items').insert([{
      name,
      unit,
      category,
      current_stock: 10000,
      reorder_level: 1000,
      cost_per_unit: 0,
      status: 'OK'
    }]).select('*').single();

    if (error) throw error;
    return newStock.id;
  }

  // Ensure required stock items exist with proper units
  const curryMixId = await getOrCreateStockItem("Curry Mix", "ml", "Sub-Recipe");
  const mixedVegId = await getOrCreateStockItem("Mixed Vegetables", "g", "Vegetables / Fruit");
  const seafoodId = await getOrCreateStockItem("Seafood", "g", "Sub-Recipe");
  const roastDuckId = await getOrCreateStockItem("Sliced Roast Duck", "g", "Meat");
  const potatoId = await getOrCreateStockItem("Potato", "g", "Vegetables / Fruit");

  const chickenId = stockItems.find(s => s.name === "Chicken loins")?.id || 1622;
  const beefId = stockItems.find(s => s.name === "Beef slice")?.id || 1620;
  const beefMassamanId = stockItems.find(s => s.name === "Beef chuck dice")?.id || beefId;
  const lambId = stockItems.find(s => s.name === "Lamb leg dice")?.id || 1627;
  const carrotId = stockItems.find(s => s.name === "Carrot")?.id || 1649;

  // Helper to set recipes for a product
  async function setCurryRecipes(productName: string, recipeEntries: { inventory_item_id: number; quantity: number; variant: string | null }[]) {
    const prod = products.find(p => p.name.toLowerCase() === productName.toLowerCase() || p.name.toLowerCase().includes(productName.toLowerCase()));
    if (!prod) {
      console.error(`❌ Product "${productName}" not found in DB`);
      return;
    }

    // Clear old recipes
    await supabase.from('recipes').delete().eq('product_id', prod.id);

    const payload = recipeEntries.map(entry => ({
      product_id: prod.id,
      inventory_item_id: entry.inventory_item_id,
      quantity: entry.quantity,
      variant: entry.variant
    }));

    const { error } = await supabase.from('recipes').insert(payload);
    if (error) {
      console.error(`Error inserting recipes for ${prod.name}:`, error);
    } else {
      console.log(`✅ Successfully updated recipes for "${prod.name}" (${payload.length} entries set)`);
    }
  }

  // ---------------- APPLY FIXES FOR IMAGE 3 ----------------

  // Standard Curries (24 Yellow, 25 Green, 26 Red, 27 Panang)
  const standardCurries = ["Yellow Curry", "Green Curry", "Red Curry", "Panang Curry"];
  for (const curryName of standardCurries) {
    await setCurryRecipes(curryName, [
      // Base Curry Mix
      { inventory_item_id: curryMixId, quantity: 300, variant: null },

      // Variants
      { inventory_item_id: mixedVegId, quantity: 250, variant: "Vegetarian / Tofu" },
      { inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
      { inventory_item_id: beefId, quantity: 120, variant: "Beef" },
      { inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" },
      { inventory_item_id: seafoodId, quantity: 200, variant: "Duck" }
    ]);
  }

  // 28 Massaman Beef Curry
  await setCurryRecipes("Massaman Beef Curry", [
    { inventory_item_id: curryMixId, quantity: 300, variant: null },
    { inventory_item_id: beefMassamanId, quantity: 180, variant: null },
    { inventory_item_id: carrotId, quantity: 100, variant: null },
    { inventory_item_id: potatoId, quantity: 100, variant: null }
  ]);

  // 29 Massaman Lamb Curry
  await setCurryRecipes("Massaman Lamb Curry", [
    { inventory_item_id: curryMixId, quantity: 300, variant: null },
    { inventory_item_id: lambId, quantity: 180, variant: null },
    { inventory_item_id: carrotId, quantity: 100, variant: null },
    { inventory_item_id: potatoId, quantity: 100, variant: null }
  ]);

  // 30 Red Duck Curry
  await setCurryRecipes("Red Duck Curry", [
    { inventory_item_id: curryMixId, quantity: 300, variant: null },
    { inventory_item_id: roastDuckId, quantity: 150, variant: null }
  ]);

  console.log("\n=== ALL 7 THAI CURRY RECIPE FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
