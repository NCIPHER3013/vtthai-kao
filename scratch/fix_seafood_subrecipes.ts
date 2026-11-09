import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== CREATING DISTINCT SUB-RECIPE FOR PRAWN & SEAFOOD MIX ===");

  const { data: stockItems } = await supabase.from('stock_items').select('*');

  let prawnSeafoodMixStockId = stockItems?.find(s => s.name === "Prawn & Seafood Mix")?.id;

  if (!prawnSeafoodMixStockId) {
    console.log("Creating dedicated Sub-Recipe Stock Item 'Prawn & Seafood Mix' (Unit: g)...");
    const { data: created, error } = await supabase.from('stock_items').insert([{
      name: "Prawn & Seafood Mix",
      unit: "g",
      category: "Sub-Recipe",
      current_stock: 10000,
      reorder_level: 1000,
      cost_per_unit: 0,
      status: "OK"
    }]).select('*').single();

    if (error) {
      console.error("Error creating stock item:", error);
      return;
    }
    prawnSeafoodMixStockId = created.id;
  }

  // Dishes to link to Prawn & Seafood Mix (Items 38 & 39)
  const targetDishes = ["Prawn and Seafood", "Chili Prawn Jam", "Chilli Seafood"];
  const { data: products } = await supabase.from('products').select('*');

  for (const dishName of targetDishes) {
    const prod = products?.find(p => p.name.toLowerCase().includes(dishName.toLowerCase()));
    if (prod) {
      console.log(`Updating recipes for "${prod.name}" (ID: ${prod.id}) to use Sub-Recipe "Prawn & Seafood Mix" (200g)`);
      await supabase.from('recipes').delete().eq('product_id', prod.id);
      await supabase.from('recipes').insert([{
        product_id: prod.id,
        inventory_item_id: prawnSeafoodMixStockId,
        quantity: 200,
        variant: null
      }]);
    }
  }

  console.log("✅ DEDICATED PRAWN & SEAFOOD MIX SUB-RECIPE CREATED & LINKED SUCCESSFULLY!");
}

main().catch(console.error);
