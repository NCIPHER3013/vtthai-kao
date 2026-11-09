import { config } from 'dotenv';
config({ path: '.env.local' });

async function dedupeStockItems() {
  const { supabase } = await import('../src/lib/supabase');
  
  const { data: stockItems, error } = await supabase
    .from('stock_items')
    .select('id, name')
    .order('id');
    
  if (error || !stockItems) {
    console.error('Error fetching stock items:', error);
    return;
  }
  
  // Group by name
  const nameMap = new Map<string, number[]>();
  for (const item of stockItems) {
    const normalizedName = item.name.toLowerCase().trim();
    if (!nameMap.has(normalizedName)) {
      nameMap.set(normalizedName, []);
    }
    nameMap.get(normalizedName)!.push(item.id);
  }
  
  const duplicateSets = Array.from(nameMap.entries()).filter(([_, ids]) => ids.length > 1);
  console.log(`Found ${duplicateSets.length} sets of duplicates.`);
  
  if (duplicateSets.length === 0) return;

  // Let's check which tables reference stock_items
  // recipes (inventory_item_id)
  // sub_recipe_ingredients (parent_item_id, child_item_id)
  // purchase_order_items (inventory_item_id)
  // inventory_ledger (item_id - wait, is this string or number?)
  
  let deletedCount = 0;
  
  for (const [name, ids] of duplicateSets) {
    // Keep the one with the highest ID (most recent) or lowest? Let's check recipes to see which one is used
    const { data: recipeData } = await supabase.from('recipes').select('id').in('inventory_item_id', ids);
    
    // Actually, to be perfectly safe, let's just attempt to delete the newer ones (highest ID) first.
    // If it fails due to FK, we try the other one.
    
    const keepId = ids[0]; // keep the lowest ID (oldest)
    const toDeleteIds = ids.slice(1);
    
    for (const idToDelete of toDeleteIds) {
      // Re-point recipes
      await supabase.from('recipes').update({ inventory_item_id: keepId }).eq('inventory_item_id', idToDelete);
      
      // Re-point sub_recipe_ingredients
      await supabase.from('sub_recipe_ingredients').update({ parent_item_id: keepId }).eq('parent_item_id', idToDelete);
      await supabase.from('sub_recipe_ingredients').update({ child_item_id: keepId }).eq('child_item_id', idToDelete);
      
      // Re-point purchase_order_items
      await supabase.from('purchase_order_items').update({ inventory_item_id: keepId }).eq('inventory_item_id', idToDelete);

      // Re-point inventory_ledger (item_id is string here per AGENTS.md)
      await supabase.from('inventory_ledger').update({ item_id: keepId.toString() }).eq('item_id', idToDelete.toString());

      // Re-point item_suppliers
      await supabase.from('item_suppliers').update({ item_id: keepId }).eq('item_id', idToDelete);

      // Re-point stocktake_items
      await supabase.from('stocktake_items').update({ stock_item_id: keepId }).eq('stock_item_id', idToDelete);

      // Try deleting
      const { error: deleteError } = await supabase.from('stock_items').delete().eq('id', idToDelete);
      
      if (deleteError) {
        console.error(`Failed to delete ID ${idToDelete} (${name}):`, deleteError.message);
      } else {
        deletedCount++;
        console.log(`Deleted duplicate ID ${idToDelete} for "${name}" (kept ${keepId})`);
      }
    }
  }
  
  console.log(`Successfully deleted ${deletedCount} duplicate items.`);
}

dedupeStockItems().catch(console.error);
