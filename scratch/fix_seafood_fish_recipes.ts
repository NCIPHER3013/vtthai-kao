import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING SEAFOOD & FISH RECIPE FIXES (Image 5) ===");

  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  if (!products || !stockItems) {
    console.error("Failed to load initial data");
    return;
  }

  // 1. Helper to ensure stock item exists
  async function getOrCreateStockItem(name: string, unit: string, category: string = 'Seafood'): Promise<number> {
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

  // 2. Helper to get or create product
  async function getOrCreateProduct(name: string, category: string = 'Main Course', price: number = 24.9): Promise<string> {
    const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase() || p.name.toLowerCase().includes(name.toLowerCase()));
    if (existing) return existing.id;

    console.log(`  ➕ Creating missing Product "${name}" (Category: ${category})`);
    const { data: newProd, error } = await supabase.from('products').insert([{
      id: crypto.randomUUID(),
      name,
      category,
      price,
      color_label: 'bg-emerald-500',
      is_active: true
    }]).select('*').single();

    if (error) throw error;
    return newProd.id;
  }

  // Ensure stock items exist with proper units
  const seafoodId = await getOrCreateStockItem("Seafood", "g", "Sub-Recipe");
  const fishFilletId = await getOrCreateStockItem("Fish Fillet", "g", "Seafood");
  const wholeFishId = stockItems.find(s => s.name.toLowerCase().includes("barramundi whole"))?.id || await getOrCreateStockItem("Whole Fish", "ea", "Seafood");

  // Helper to set recipes for a product
  async function setRecipesForProduct(productId: string, productName: string, recipeEntries: { inventory_item_id: number; quantity: number; variant: string | null }[]) {
    // Clear old recipes completely
    await supabase.from('recipes').delete().eq('product_id', productId);

    const payload = recipeEntries.map(entry => ({
      product_id: productId,
      inventory_item_id: entry.inventory_item_id,
      quantity: entry.quantity,
      variant: entry.variant
    }));

    const { error } = await supabase.from('recipes').insert(payload);
    if (error) {
      console.error(`Error inserting recipes for ${productName}:`, error);
    } else {
      console.log(`✅ Successfully updated recipes for "${productName}" (${payload.length} entries set)`);
    }
  }

  // ------------ SECTION 6: SEAFOOD (38-39) ------------

  const seafoodDishes = [
    "Prawn and Seafood",
    "Chilli Prawn Jam",
    "Chilli Seafood"
  ];

  for (const dishName of seafoodDishes) {
    const prodId = await getOrCreateProduct(dishName, "Seafood / Fish", 24.9);
    await setRecipesForProduct(prodId, dishName, [
      { inventory_item_id: seafoodId, quantity: 200, variant: null }
    ]);
  }

  // ------------ SECTION 7: FISH (40-46) ------------

  const fishDishes = [
    "Pla Sarm Rod",
    "Pla Choo Chee",
    "Pla Lord Khing",
    "Lime Fish",
    "Golden Fried Fish",
    "Steamed Fish with Soy Sauce",
    "Pla Lui Suan"
  ];

  for (const dishName of fishDishes) {
    const prodId = await getOrCreateProduct(dishName, "Seafood / Fish", 29.9);
    await setRecipesForProduct(prodId, dishName, [
      { inventory_item_id: fishFilletId, quantity: 350, variant: "Fish Fillet" },
      { inventory_item_id: wholeFishId, quantity: 1, variant: "Whole Fish" }
    ]);
  }

  console.log("\n=== ALL SEAFOOD & FISH RECIPE FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
