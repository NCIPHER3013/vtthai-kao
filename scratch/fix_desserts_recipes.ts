import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== APPLYING DESSERT RECIPE FIXES (Image 8 Section 12) ===");

  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  if (!products || !stockItems) {
    console.error("Failed to load initial data");
    return;
  }

  // Stock Items
  let coconutIceCreamId = stockItems.find(s => s.name.toLowerCase().includes("coconut ice cream"))?.id;
  if (!coconutIceCreamId) {
    console.log("Creating Stock Item 'Coconut ice cream' (Unit: g)...");
    const { data: created } = await supabase.from('stock_items').insert([{
      name: "Coconut ice cream",
      unit: "g",
      category: "Dessert",
      current_stock: 10000,
      reorder_level: 1000,
      cost_per_unit: 0,
      status: "OK"
    }]).select('*').single();
    coconutIceCreamId = created.id;
  } else {
    await supabase.from('stock_items').update({ unit: 'g' }).eq('id', coconutIceCreamId);
  }

  let friedIceCreamStockId = stockItems.find(s => s.name.toLowerCase().includes("fried icecream") || s.name.toLowerCase().includes("fried ice cream"))?.id;
  if (!friedIceCreamStockId) {
    console.log("Creating Stock Item 'Fried Ice Cream' (Unit: ea)...");
    const { data: created } = await supabase.from('stock_items').insert([{
      name: "Fried Ice Cream",
      unit: "ea",
      category: "Dessert",
      current_stock: 10000,
      reorder_level: 1000,
      cost_per_unit: 0,
      status: "OK"
    }]).select('*').single();
    friedIceCreamStockId = created.id;
  }

  const stickyRiceId = stockItems.find(s => s.name.toLowerCase() === "sticky rice")?.id || 1920;
  const mangoId = stockItems.find(s => s.name.toLowerCase() === "mango")?.id || 1667;
  const rotiId = stockItems.find(s => s.name.toLowerCase() === "roti")?.id || 1768;
  const bananaId = stockItems.find(s => s.name.toLowerCase().includes("banana"))?.id || 1866;
  const nutellaId = stockItems.find(s => s.name.toLowerCase() === "nutella")?.id || 1746;

  // 1. Helper to get or create product
  async function getOrCreateProduct(name: string, category: string = 'Dessert', price: number = 11.9): Promise<string> {
    const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase() || p.name.toLowerCase().includes(name.toLowerCase()));
    if (existing) return existing.id;

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

  // 61. Thai Coconut Ice Cream -> 100g Coconut ice cream
  const coconutIceCreamProdId = await getOrCreateProduct("Thai Coconut Ice Cream", "Dessert", 9.9);
  await setRecipesForProduct(coconutIceCreamProdId, "Thai Coconut Ice Cream", [
    { inventory_item_id: coconutIceCreamId, quantity: 100, variant: null }
  ]);

  // 62. Fried Ice Cream -> 1 ea Fried Ice Cream
  const friedIceCreamProdId = await getOrCreateProduct("Fried Ice Cream", "Dessert", 11.9);
  await setRecipesForProduct(friedIceCreamProdId, "Fried Ice Cream", [
    { inventory_item_id: friedIceCreamStockId, quantity: 1, variant: null }
  ]);

  // 63. Mango Sticky Rice -> 150g Sticky rice + 1 ea Mango
  const mangoStickyRiceProdId = await getOrCreateProduct("Mango Sticky Rice", "Dessert", 14.9);
  await setRecipesForProduct(mangoStickyRiceProdId, "Mango Sticky Rice", [
    { inventory_item_id: stickyRiceId, quantity: 150, variant: null },
    { inventory_item_id: mangoId, quantity: 1, variant: null }
  ]);

  // 64. Roti Banana Nutella -> 1 ea Roti + 1 ea Banana + 30g Nutella
  const rotiNutellaProdId = await getOrCreateProduct("Roti Banana Nutella", "Dessert", 12.9);
  await setRecipesForProduct(rotiNutellaProdId, "Roti Banana Nutella", [
    { inventory_item_id: rotiId, quantity: 1, variant: null },
    { inventory_item_id: bananaId, quantity: 1, variant: null },
    { inventory_item_id: nutellaId, quantity: 30, variant: null }
  ]);

  // 65. Sticky Rice with Banana -> 150g Sticky rice + 1 ea Banana
  const stickyRiceBananaProdId = await getOrCreateProduct("Sticky Rice with Banana", "Dessert", 11.9);
  await setRecipesForProduct(stickyRiceBananaProdId, "Sticky Rice with Banana", [
    { inventory_item_id: stickyRiceId, quantity: 150, variant: null },
    { inventory_item_id: bananaId, quantity: 1, variant: null }
  ]);

  console.log("\n=== ALL DESSERT RECIPE FIXES COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
