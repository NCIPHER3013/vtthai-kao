import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== CLEANING UP OLD DUPLICATE SEAFOOD ITEMS ===");

  // 1. Update Seafood (ID 2291, unit 'g') category to 'Sub-Recipe'
  const { error: upErr } = await supabase.from('stock_items')
    .update({ category: 'Sub-Recipe' })
    .eq('name', 'Seafood')
    .eq('unit', 'g');

  if (upErr) console.error("Error updating Seafood category:", upErr);
  else console.log("✅ Updated category of Seafood (Unit: g) to 'Sub-Recipe'");

  // 2. Delete old redundant items 'Seafood Mix' (ID 2277) and 'Seafood set' (ID 1913) if not referenced
  // First update any remaining recipes that referenced them to ID 2291
  await supabase.from('recipes').update({ inventory_item_id: 2291 }).eq('inventory_item_id', 2277);
  await supabase.from('recipes').update({ inventory_item_id: 2291 }).eq('inventory_item_id', 1913);

  const { error: delErr1 } = await supabase.from('stock_items').delete().eq('id', 2277);
  if (delErr1) console.error("Error deleting Seafood Mix:", delErr1);
  else console.log("🗑️ Deleted old unused item 'Seafood Mix' (ID: 2277)");

  const { error: delErr2 } = await supabase.from('stock_items').delete().eq('id', 1913);
  if (delErr2) console.error("Error deleting Seafood set:", delErr2);
  else console.log("🗑️ Deleted old unused item 'Seafood set' (ID: 1913)");

  console.log("=== SEAFOOD CLEANUP COMPLETE ===");
}

main().catch(console.error);
