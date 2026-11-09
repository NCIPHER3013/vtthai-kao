import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItems } = await supabase.from('stock_items').select('*');

  const seafoodStock = stockItems?.find(s => s.name === "Seafood" && s.category === "Sub-Recipe");
  const prawnSeafoodMixStock = stockItems?.find(s => s.name === "Prawn & Seafood Mix" && s.category === "Sub-Recipe");

  if (!seafoodStock) return;

  const prawnStockId = stockItems?.find(s => s.name.toLowerCase().includes("prawn raw"))?.id || 1637;
  const duckStockId = stockItems?.find(s => s.name.toLowerCase().includes("duck") && s.unit === "g")?.id || 2294;
  const squidStockId = stockItems?.find(s => s.name.toLowerCase().includes("squid"))?.id || 1639;
  const fishStockId = stockItems?.find(s => s.name.toLowerCase().includes("fish fillet"))?.id || 2295;

  await supabase.from('sub_recipe_ingredients').delete().eq('parent_item_id', seafoodStock.id);
  if (prawnSeafoodMixStock) {
    await supabase.from('sub_recipe_ingredients').delete().eq('parent_item_id', prawnSeafoodMixStock.id);
  }

  // 1. Seafood Sub-Recipe: Prawn + Duck + Squid
  await supabase.from('sub_recipe_ingredients').insert([
    { parent_item_id: seafoodStock.id, child_item_id: prawnStockId, quantity: 70 },
    { parent_item_id: seafoodStock.id, child_item_id: duckStockId, quantity: 60 },
    { parent_item_id: seafoodStock.id, child_item_id: squidStockId, quantity: 70 }
  ]);

  // 2. Prawn & Seafood Mix Sub-Recipe: Prawn + Squid + Fish
  if (prawnSeafoodMixStock) {
    await supabase.from('sub_recipe_ingredients').insert([
      { parent_item_id: prawnSeafoodMixStock.id, child_item_id: prawnStockId, quantity: 70 },
      { parent_item_id: prawnSeafoodMixStock.id, child_item_id: squidStockId, quantity: 70 },
      { parent_item_id: prawnSeafoodMixStock.id, child_item_id: fishStockId, quantity: 60 }
    ]);
  }

  console.log("✅ FIXED SUB-RECIPE INGREDIENTS WITH PRAWN RAW & DUCK!");
}

main().catch(console.error);
