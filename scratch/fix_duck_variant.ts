import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== CLEANING AND RE-INSERTING DUCK RECIPES ===");

  // Fetch duck recipes
  const { data: duckRecipes } = await supabase.from('recipes').select('*').eq('variant', 'Duck');
  
  if (duckRecipes && duckRecipes.length > 0) {
    const ids = duckRecipes.map(r => r.id);
    await supabase.from('recipes').delete().in('id', ids);
  }

  // Also check product IDs of all main stir-fry and curry products and insert unique duck recipe row
  const { data: products } = await supabase.from('products').select('*');
  const duckProdNames = [
    "Tom Yum", "Tom Kha", "Bangkok Ocean Volcano Noodle",
    "Yellow Curry", "Green Curry", "Red Curry", "Panang Curry",
    "Stir Fried Sweet Basil", "Stir Fried Cashew Nut", "Stir Fried Sweet Ginger",
    "Stir Fried Oyster Sauce", "Stir Fried Sweet & Sour", "Stir Fried Garlic & Pepper",
    "Stir Fried Fresh Chilli Chicken"
  ];

  for (const pName of duckProdNames) {
    const prod = products?.find(p => p.name.toLowerCase() === pName.toLowerCase());
    if (prod) {
      // Delete existing Duck variant for this product
      await supabase.from('recipes').delete().eq('product_id', prod.id).eq('variant', 'Duck');
      
      // Insert clean Duck recipe row: Sliced Roast Duck (ID: 2294), Qty 150g
      const { error } = await supabase.from('recipes').insert([{
        product_id: prod.id,
        inventory_item_id: 2294,
        quantity: 150,
        variant: 'Duck'
      }]);

      if (error) console.error(`Error inserting Duck recipe for ${pName}:`, error);
      else console.log(`✅ Set Duck variant for "${pName}" to Sliced Roast Duck (150 g)`);
    }
  }
}

main().catch(console.error);
