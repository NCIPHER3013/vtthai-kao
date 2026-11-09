import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING ENTREE RECIPE FIXES (Image 1) ===");

  // 1. Fetch products, stock items, recipes
  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*');

  if (!products || !stockItems || !recipes) {
    console.error("Failed to load initial data");
    return;
  }

  const stockMapByName = new Map<string, any>();
  stockItems.forEach(s => stockMapByName.set(s.name.toLowerCase(), s));

  // Helper to ensure a stock item exists with unit 'ea'
  async function getOrCreateStockItem(name: string, unit: string = 'ea', category: string = 'Appetizer'): Promise<number> {
    const existing = stockItems.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      // If unit is 'g' and needs to be 'ea', update it or use it
      if (existing.unit === 'g' && unit === 'ea') {
        console.log(`  Updating unit of Stock Item "${existing.name}" (ID: ${existing.id}) from 'g' to 'ea'`);
        await supabase.from('stock_items').update({ unit: 'ea' }).eq('id', existing.id);
      }
      return existing.id;
    }

    console.log(`  ➕ Creating missing Stock Item "${name}" (Unit: ${unit})`);
    const { data: newStock, error } = await supabase.from('stock_items').insert([{
      name,
      unit,
      category,
      current_stock: 100,
      reorder_level: 10,
      cost_per_unit: 0,
      status: 'OK'
    }]).select('*').single();

    if (error) {
      console.error(`  Error creating stock item ${name}:`, error);
      throw error;
    }
    return newStock.id;
  }

  // Helper to set exact recipe for a product
  async function setExactRecipe(productName: string, ingredientName: string, quantity: number, unit: string = 'ea') {
    const prod = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!prod) {
      console.error(`❌ Product "${productName}" not found in DB`);
      return;
    }

    const stockId = await getOrCreateStockItem(ingredientName, unit);

    // Delete existing recipes for this product
    const { error: delErr } = await supabase.from('recipes').delete().eq('product_id', prod.id);
    if (delErr) {
      console.error(`Error clearing recipe for ${productName}:`, delErr);
      return;
    }

    // Insert new clean recipe
    const { error: insErr } = await supabase.from('recipes').insert([{
      product_id: prod.id,
      inventory_item_id: stockId,
      quantity,
      variant: null
    }]);

    if (insErr) {
      console.error(`Error inserting recipe for ${productName}:`, insErr);
    } else {
      console.log(`✅ Fixed Recipe for "${productName}": ${quantity} ${unit} of "${ingredientName}" (Stock ID: ${stockId})`);
    }
  }

  // ---------------- FIXES FOR IMAGE 1 ----------------

  // 02 Vegetarian Spring Roll -> 4 pcs
  await setExactRecipe("Veg Spring Roll", "Veg Spring Roll", 4, 'ea');

  // 03 Chicken Spring Roll -> 4 pcs
  await setExactRecipe("Chicken Spring Roll (4pcs)", "Chicken Spring Roll", 4, 'ea');

  // 04 Vegetarian Curry Puff -> 4 pcs
  await setExactRecipe("Veg Curry Puff", "Veg Curry Puff", 4, 'ea');

  // 05 Lava Chicken Pop -> 4 pcs
  await setExactRecipe("Chicken Pop", "Lava Chicken Pop", 4, 'ea');

  // 06 Chicken Curry Puff -> 4 pcs
  await setExactRecipe("Chicken Curry Puff", "Chicken Curry Puff", 4, 'ea');

  // 09 Fried Tofu -> 6 pcs
  await setExactRecipe("Fried Tofu", "tofu", 6, 'ea');

  // 14 Salt & Pepper Chicken Spare Ribs -> 200g Chicken spare rib only
  await setExactRecipe("Salt and Pepper Chicken Spare Ribs", "Chicken spare rib", 200, 'g');

  // 16 Salt & Pepper Squid -> 200g Squid pine apple cut only
  await setExactRecipe("Salt and Pepper Squid", "Squid pine apple cut", 200, 'g');

  console.log("\n=== ALL 8 ENTREE RECIPE FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
