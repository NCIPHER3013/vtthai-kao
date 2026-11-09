import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== POPULATING ALL RECIPE STOCK ITEMS WITH ABUNDANT STOCK ===");

  const { data: recipes } = await supabase.from('recipes').select('inventory_item_id');
  if (!recipes || recipes.length === 0) return;

  const usedStockIds = [...new Set(recipes.map(r => r.inventory_item_id))];
  console.log(`Found ${usedStockIds.length} unique stock items used in recipes.`);

  for (const stockId of usedStockIds) {
    const { error } = await supabase.from('stock_items')
      .update({
        current_stock: 10000,
        reorder_level: 1000,
        status: 'OK'
      })
      .eq('id', stockId);

    if (error) {
      console.error(`Error updating stock item ID ${stockId}:`, error);
    }
  }

  // Also update products status to ACTIVE if needed
  const { data: prods } = await supabase.from('products').select('*');
  for (const p of prods || []) {
    if (!p.is_active) {
      console.log(`Setting product "${p.name}" (ID: ${p.id}) is_active = true`);
      await supabase.from('products').update({ is_active: true }).eq('id', p.id);
    }
  }

  console.log("✅ SUCCESSFULLY SET ALL RECIPE STOCK ITEMS TO 10,000 STOCK & STATUS 'OK'!");
}

main().catch(console.error);
