import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING STIR FRIED NOODLES & FRIED RICE RECIPE FIXES (Image 6) ===");

  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  if (!products || !stockItems) {
    console.error("Failed to load initial data");
    return;
  }

  // 1. Helper to ensure stock item exists
  async function getOrCreateStockItem(name: string, unit: string, category: string = 'Dry Goods'): Promise<number> {
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
  async function getOrCreateProduct(name: string, category: string = 'Noodle / Rice', price: number = 21.9): Promise<string> {
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

  // Stock Items needed
  const eggId = await getOrCreateStockItem("Egg", "ea", "Dry Goods");
  const cookedRiceId = await getOrCreateStockItem("Cooked Rice", "g", "Sub-Recipe");
  const mixedVegId = await getOrCreateStockItem("Mixed Vegetables", "g", "Vegetables / Fruit");
  const seafoodId = await getOrCreateStockItem("Seafood", "g", "Sub-Recipe");
  const chickenId = stockItems.find(s => s.name === "Chicken loins")?.id || 1622;
  const beefId = stockItems.find(s => s.name === "Beef slice")?.id || 1620;

  // Noodle Stock Items
  const padThaiNoodleId = await getOrCreateStockItem("Pad Thai Noodle", "g", "Dry Goods");
  const flatRiceNoodleId = await getOrCreateStockItem("Flat Rice Noodle", "g", "Dry Goods");
  const yellowNoodleId = await getOrCreateStockItem("Yellow Noodle", "g", "Dry Goods");
  const spicyNoodleId = await getOrCreateStockItem("Spicy Noodle", "g", "Dry Goods");

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

  // ------------ SECTION 8: STIR FRIED NOODLES (51-55) ------------

  const noodlesSpecs = [
    { name: "Pad Thai", noodleId: padThaiNoodleId, qty: 250 },
    { name: "Pad See Ew", noodleId: flatRiceNoodleId, qty: 250 },
    { name: "Pad Mee Leung", noodleId: yellowNoodleId, qty: 180 },
    { name: "Pad Kee Mao", noodleId: flatRiceNoodleId, qty: 240 },
    { name: "Spicy Noodle", noodleId: spicyNoodleId, qty: 250 }
  ];

  for (const spec of noodlesSpecs) {
    const prodId = await getOrCreateProduct(spec.name, "Noodle / Rice", 21.9);
    
    await setRecipesForProduct(prodId, spec.name, [
      // Base: Noodle + 1 Egg
      { inventory_item_id: spec.noodleId, quantity: spec.qty, variant: null },
      { inventory_item_id: eggId, quantity: 1, variant: null },
      // Variants
      { inventory_item_id: mixedVegId, quantity: 250, variant: "Vegetarian / Tofu" },
      { inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
      { inventory_item_id: beefId, quantity: 120, variant: "Beef" },
      { inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" }
    ]);
  }

  // ------------ SECTION 9: FRIED RICE (56-60) ------------

  const friedRiceSpecs = [
    "Thai Fried Rice",
    "Tom Yum Fried Rice",
    "Salt & Pepper Crispy Chicken Fried Rice",
    "Pineapple Fried Rice"
  ];

  for (const dishName of friedRiceSpecs) {
    const prodId = await getOrCreateProduct(dishName, "Noodle / Rice", 21.9);

    await setRecipesForProduct(prodId, dishName, [
      // Base: Cooked Rice 250g + 1 Egg
      { inventory_item_id: cookedRiceId, quantity: 250, variant: null },
      { inventory_item_id: eggId, quantity: 1, variant: null },
      // Variants
      { inventory_item_id: mixedVegId, quantity: 130, variant: "Vegetarian / Tofu" },
      { inventory_item_id: chickenId, quantity: 120, variant: "Chicken" },
      { inventory_item_id: beefId, quantity: 120, variant: "Beef" },
      { inventory_item_id: seafoodId, quantity: 200, variant: "Prawn / Seafood" }
    ]);
  }

  // 60. Egg Fried Rice (#60) -> Base: Cooked Rice 350g + 2 Eggs (No variants)
  const eggFriedRiceId = await getOrCreateProduct("Egg Fried Rice", "Noodle / Rice", 17.9);
  await setRecipesForProduct(eggFriedRiceId, "Egg Fried Rice", [
    { inventory_item_id: cookedRiceId, quantity: 350, variant: null },
    { inventory_item_id: eggId, quantity: 2, variant: null }
  ]);

  console.log("\n=== ALL STIR FRIED NOODLES & FRIED RICE FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
