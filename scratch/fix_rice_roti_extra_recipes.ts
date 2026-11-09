import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING RICE & ROTI AND EXTRA ADD-ON RECIPE FIXES (Image 7) ===");

  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  if (!products || !stockItems) {
    console.error("Failed to load initial data");
    return;
  }

  // Stock items needed
  const jasmineRiceId = stockItems.find(s => s.name === "Jasmine rice")?.id || 1889;
  const cocoRiceId = stockItems.find(s => s.name === "Coco rice")?.id || 1871;
  const mixedVegId = stockItems.find(s => s.name === "Mixed Vegetables")?.id || 2275;
  const eggId = stockItems.find(s => s.name === "Egg")?.id || 2277;
  const chickenId = stockItems.find(s => s.name === "Chicken loins")?.id || 1622;
  const beefId = stockItems.find(s => s.name === "Beef slice")?.id || 1620;
  const seafoodId = stockItems.find(s => s.name === "Seafood")?.id || 2291;
  const duckId = stockItems.find(s => s.name === "Sliced Roast Duck" || s.name === "Duck (Sliced Roast)")?.id || 2294;

  // 1. Helper to get or create product
  async function getOrCreateProduct(name: string, category: string, price: number): Promise<string> {
    const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.price !== price) {
        console.log(`  Updating price of "${existing.name}" to $${price}`);
        await supabase.from('products').update({ price }).eq('id', existing.id);
      }
      return existing.id;
    }

    console.log(`  ➕ Creating missing Product "${name}" ($${price}, Category: ${category})`);
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

  // 2. Helper to set recipes for a product
  async function setRecipesForProduct(productId: string, productName: string, recipeEntries: { inventory_item_id: number; quantity: number; variant: string | null }[]) {
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

  // ------------ SECTION 10: RICE & ROTI ------------

  // 1. Steam Jasmine Rice -> 650g Jasmine rice
  const jasmineRiceProdId = await getOrCreateProduct("Steam Jasmine Rice", "Sides / Rice", 4.5);
  await setRecipesForProduct(jasmineRiceProdId, "Steam Jasmine Rice", [
    { inventory_item_id: jasmineRiceId, quantity: 650, variant: null }
  ]);

  // 2. Coconut Rice -> 650g Coco rice (Clean extra sauce)
  const cocoRiceProdId = await getOrCreateProduct("Coconut Rice", "Sides / Rice", 5.5);
  await setRecipesForProduct(cocoRiceProdId, "Coconut Rice", [
    { inventory_item_id: cocoRiceId, quantity: 650, variant: null }
  ]);

  // ------------ SECTION 11: EXTRAS / ADD-ONS ------------

  const addOns = [
    { name: "Extra Veg", price: 4.0, stockId: mixedVegId, qty: 100 },
    { name: "Extra Egg", price: 5.0, stockId: eggId, qty: 1 },
    { name: "Extra Chicken", price: 6.0, stockId: chickenId, qty: 80 },
    { name: "Extra Beef", price: 7.0, stockId: beefId, qty: 80 },
    { name: "Extra Prawn & Seafood", price: 9.0, stockId: seafoodId, qty: 120 },
    { name: "Extra Duck", price: 9.0, stockId: duckId, qty: 100 }
  ];

  for (const item of addOns) {
    const prodId = await getOrCreateProduct(item.name, "Extras", item.price);
    await setRecipesForProduct(prodId, item.name, [
      { inventory_item_id: item.stockId, quantity: item.qty, variant: null }
    ]);
  }

  console.log("\n=== ALL RICE & ROTI AND EXTRA ADD-ON FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
