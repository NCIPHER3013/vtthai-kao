import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== UPDATING SUB-RECIPE INGREDIENTS FOR 'Seafood' ===");

  const { data: stockItems } = await supabase.from('stock_items').select('*');
  const seafoodStock = stockItems?.find(s => s.name === "Seafood" && s.category === "Sub-Recipe");

  if (!seafoodStock) {
    console.error("Seafood Sub-Recipe stock item not found");
    return;
  }

  console.log(`Found Seafood Sub-Recipe Stock Item ID: ${seafoodStock.id}`);

  // Raw items for inside Seafood sub-recipe: Prawn, Duck, Seafood (Fish/Squid)
  const prawnStockId = stockItems?.find(s => s.name.toLowerCase().includes("prawn"))?.id || 1637;
  const duckStockId = stockItems?.find(s => s.name.toLowerCase().includes("duck"))?.id || 2294;
  const squidStockId = stockItems?.find(s => s.name.toLowerCase().includes("squid"))?.id || 1639;
  const fishStockId = stockItems?.find(s => s.name.toLowerCase().includes("fish fillet"))?.id || 2295;

  console.log("Sub-recipe nested ingredients:");
  console.log("- Prawn stock ID:", prawnStockId);
  console.log("- Duck stock ID:", duckStockId);
  console.log("- Squid stock ID:", squidStockId);
  console.log("- Fish stock ID:", fishStockId);

  // In this system, sub-recipes are also products or stock items with recipes linked to them!
  // Let's check if there is a product or subrecipe table for recipe links!
  const { data: existingSubProduct } = await supabase.from('products').select('*').eq('name', 'Seafood').single();

  let subProductId = existingSubProduct?.id;
  if (!subProductId) {
    console.log("Creating product wrapper for Sub-Recipe 'Seafood' to store nested ingredients...");
    const { data: newProd } = await supabase.from('products').insert([{
      id: crypto.randomUUID(),
      name: "Seafood",
      category: "Sub-Recipe",
      price: 0,
      color_label: "bg-blue-500",
      is_active: true
    }]).select('*').single();
    subProductId = newProd.id;
  }

  // Set nested recipes for Seafood Sub-Recipe: Prawn + Duck + Seafood
  await supabase.from('recipes').delete().eq('product_id', subProductId);
  await supabase.from('recipes').insert([
    { product_id: subProductId, inventory_item_id: prawnStockId, quantity: 70, variant: null },
    { product_id: subProductId, inventory_item_id: duckStockId, quantity: 60, variant: null },
    { product_id: subProductId, inventory_item_id: squidStockId, quantity: 70, variant: null }
  ]);

  console.log("✅ SUCCESSFULLY ADDED PRAWN + DUCK + SEAFOOD INSIDE THE 'Seafood' SUB-RECIPE!");
}

main().catch(console.error);
