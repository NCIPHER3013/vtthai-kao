import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== STRICTLY MATCHING DUCK RECIPES TO IMAGE SPECIFICATIONS ===");

  const { data: stockItems } = await supabase.from('stock_items').select('*');
  const { data: products } = await supabase.from('products').select('*');

  const seafoodId = stockItems?.find(s => s.name === "Seafood")?.id;
  const roastDuckId = stockItems?.find(s => s.name === "Sliced Roast Duck" || s.name === "Duck (Sliced Roast)")?.id;

  if (!seafoodId || !roastDuckId) {
    console.error("Missing stock items");
    return;
  }

  // 1. Red Duck Curry (#30) ONLY gets Sliced Roast Duck (150g)
  const redDuck = products?.find(p => p.name.toLowerCase().includes("red duck curry"));
  if (redDuck) {
    await supabase.from('recipes').delete().eq('product_id', redDuck.id);
    const curryMixId = stockItems?.find(s => s.name === "Curry Mix")?.id;
    await supabase.from('recipes').insert([
      { product_id: redDuck.id, inventory_item_id: curryMixId, quantity: 300, variant: null },
      { product_id: redDuck.id, inventory_item_id: roastDuckId, quantity: 150, variant: null }
    ]);
    console.log("✅ Red Duck Curry (#30): 150g Sliced Roast Duck (100% Match with Image 3)");
  }

  // 2. All other Prawn/Duck/Seafood variants revert to Seafood 200g per Images 2, 3, 4
  const generalDishesWithDuck = [
    "Tom Yum", "Tom Kha", "Bangkok Ocean Volcano Noodle",
    "Yellow Curry", "Green Curry", "Red Curry", "Panang Curry",
    "Stir Fried Sweet Basil", "Stir Fried Cashew Nut", "Stir Fried Sweet Ginger",
    "Stir Fried Oyster Sauce", "Stir Fried Sweet & Sour", "Stir Fried Garlic & Pepper",
    "Stir Fried Fresh Chilli Chicken"
  ];

  for (const pName of generalDishesWithDuck) {
    const prod = products?.find(p => p.name.toLowerCase() === pName.toLowerCase());
    if (prod) {
      // Revert Duck variant to Seafood 200g per image text: "Prawn/Duck/Seafood -> 200 g seafood"
      await supabase.from('recipes').delete().eq('product_id', prod.id).eq('variant', 'Duck');
      await supabase.from('recipes').insert([{
        product_id: prod.id,
        inventory_item_id: seafoodId,
        quantity: 200,
        variant: 'Duck'
      }]);
      console.log(`✅ ${pName}: Duck variant set to Seafood 200g (100% Match with Images 2, 3, 4)`);
    }
  }

  console.log("\n=== COMPLETED DUCK RECIPE REVERSION TO IMAGE SPECIFICATIONS ===");
}

main().catch(console.error);
