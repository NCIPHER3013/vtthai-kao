import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING STIR-FRIED & SALAD RECIPE FIXES (Image 4) ===");

  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  if (!products || !stockItems) {
    console.error("Failed to load initial data");
    return;
  }

  // 1. Helper to ensure stock item exists with proper unit
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

  // 2. Helper to get or create product
  async function getOrCreateProduct(name: string, category: string = 'Main Course', price: number = 21.9): Promise<string> {
    const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
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

    if (error) {
      console.error(`Error creating product ${name}:`, error);
      throw error;
    }
    return newProd.id;
  }

  // Ensure stock items exist with proper units
  const mixedVegId = await getOrCreateStockItem("Mixed Vegetables", "g", "Vegetables / Fruit");
  const seafoodId = await getOrCreateStockItem("Seafood", "g", "Sub-Recipe");
  const oysterSauceId = await getOrCreateStockItem("Oyster sauce", "ml", "Dry Goods");
  const papayaId = await getOrCreateStockItem("Papaya", "g", "Vegetables / Fruit");
  const chickenMinceId = await getOrCreateStockItem("Chicken mince", "g", "Meat");
  const beefPorterhouseId = await getOrCreateStockItem("Beef porterhouse", "g", "Meat");

  const chickenId = stockItems.find(s => s.name === "Chicken loins")?.id || 1622;
  const beefId = stockItems.find(s => s.name === "Beef slice")?.id || 1620;

  // Helper to set recipes for a product
  async function setRecipesForProduct(productId: string, productName: string, recipeEntries: { inventory_item_id: number; quantity: number; variant: string | null }[]) {
    // Clear old recipes
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

  // ------------ SECTION 4: THAI STIR FRIED (31-37) ------------

  const stirFriedDishes = [
    "Stir Fried Sweet Basil",
    "Stir Fried Cashew Nut",
    "Stir Fried Sweet Ginger",
    "Stir Fried Oyster Sauce",
    "Stir Fried Sweet & Sour",
    "Stir Fried Garlic & Pepper",
    "Stir Fried Fresh Chilli Chicken"
  ];

  for (const dishName of stirFriedDishes) {
    const prodId = await getOrCreateProduct(dishName, "Main Course", 21.9);

    const entries: { inventory_item_id: number; quantity: number; variant: string | null }[] = [];

    // Oyster sauce gets 50ml oyster sauce in Base
    if (dishName === "Stir Fried Oyster Sauce") {
      entries.push({ inventory_item_id: oysterSauceId, quantity: 50, variant: null });
    }

    // Standard Variants for all Stir Fried dishes:
    entries.push(
      { inventory_item_id: mixedVegId, quantity: 250, variant: "Vegetarian / Tofu" },
      { inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
      { inventory_item_id: beefId, quantity: 120, variant: "Beef" },
      { inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" },
      { inventory_item_id: seafoodId, quantity: 200, variant: "Duck" }
    );

    await setRecipesForProduct(prodId, dishName, entries);
  }

  // ------------ SECTION 5: SALAD (47-50) ------------

  // 47. Som Tum (Green Papaya Salad) -> 150g Papaya (no meat)
  const somTumId = await getOrCreateProduct("Som Tum", "Salad", 18.9);
  await setRecipesForProduct(somTumId, "Som Tum", [
    { inventory_item_id: papayaId, quantity: 150, variant: null }
  ]);

  // 48. Larb Gai (Chicken Mince Salad) -> 200g minced chicken + 150g mixed veg
  const larbGaiId = await getOrCreateProduct("Larb Gai", "Salad", 20.9);
  await setRecipesForProduct(larbGaiId, "Larb Gai", [
    { inventory_item_id: chickenMinceId, quantity: 200, variant: null },
    { inventory_item_id: mixedVegId, quantity: 150, variant: null }
  ]);

  // 49. Beef Salad -> 200g beef + 150g mixed veg
  const beefSaladId = await getOrCreateProduct("Beef Salad", "Salad", 22.9);
  await setRecipesForProduct(beefSaladId, "Beef Salad", [
    { inventory_item_id: beefId, quantity: 200, variant: null },
    { inventory_item_id: mixedVegId, quantity: 150, variant: null }
  ]);

  // 50. Beef BBQ (BBQ Beef Porterhouse) -> 200g beef porterhouse + 150g mixed veg
  const beefBbqId = await getOrCreateProduct("Beef BBQ", "Salad", 24.9);
  await setRecipesForProduct(beefBbqId, "Beef BBQ", [
    { inventory_item_id: beefPorterhouseId, quantity: 200, variant: null },
    { inventory_item_id: mixedVegId, quantity: 150, variant: null }
  ]);

  console.log("\n=== ALL STIR-FRIED & SALAD RECIPE FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
