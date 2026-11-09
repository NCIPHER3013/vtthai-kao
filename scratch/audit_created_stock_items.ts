import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stockItems } = await supabase.from('stock_items').select('*');
  const { data: recipes } = await supabase.from('recipes').select('*, stock_items(*), products(*)');

  console.log("\n================ AUDIT: NEWLY CREATED/UPDATED STOCK ITEMS ================\n");

  const newlyCreated = stockItems?.filter(s => s.id >= 2275 || s.name === "Mixed Vegetables" || s.name === "Seafood" || s.name === "Curry Mix" || s.name === "Sliced Roast Duck" || s.name === "Fish Fillet" || s.name === "Egg");

  newlyCreated?.forEach(s => {
    console.log(`📌 Stock Item [ID: ${s.id}]: "${s.name}" (Unit: ${s.unit}, Category: ${s.category})`);
  });

  console.log("\n================ TOTAL UNIQUE STOCK ITEMS USED IN RECIPES ================\n");

  const usedStockIds = new Set(recipes?.map(r => r.inventory_item_id));
  console.log(`Total unique stock items used across all recipes: ${usedStockIds.size}`);

  const usedStocks = stockItems?.filter(s => usedStockIds.has(s.id));
  usedStocks?.forEach(s => {
    console.log(`   - [ID: ${s.id}] "${s.name}" (${s.unit})`);
  });
}

main().catch(console.error);
