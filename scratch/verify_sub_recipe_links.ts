import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItems } = await supabase.from('stock_items').select('*');
  const stockMap = new Map<number, any>();
  stockItems?.forEach(s => stockMap.set(s.id, s));

  const seafoodStock = stockItems?.find(s => s.name === "Seafood" && s.category === "Sub-Recipe");
  const prawnSeafoodMixStock = stockItems?.find(s => s.name === "Prawn & Seafood Mix" && s.category === "Sub-Recipe");

  console.log("\n=== VERIFYING SUB-RECIPE INGREDIENTS IN DB ===");

  if (seafoodStock) {
    const { data: links } = await supabase.from('sub_recipe_ingredients').select('*').eq('parent_item_id', seafoodStock.id);
    console.log(`📜 Sub-Recipe "${seafoodStock.name}" (${seafoodStock.id}):`);
    links?.forEach(l => {
      const child = stockMap.get(l.child_item_id);
      console.log(`   - Ingredient: "${child?.name}" (${l.quantity} ${child?.unit})`);
    });
  }

  if (prawnSeafoodMixStock) {
    const { data: links } = await supabase.from('sub_recipe_ingredients').select('*').eq('parent_item_id', prawnSeafoodMixStock.id);
    console.log(`📜 Sub-Recipe "${prawnSeafoodMixStock.name}" (${prawnSeafoodMixStock.id}):`);
    links?.forEach(l => {
      const child = stockMap.get(l.child_item_id);
      console.log(`   - Ingredient: "${child?.name}" (${l.quantity} ${child?.unit})`);
    });
  }
}

main().catch(console.error);
