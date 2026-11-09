import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';
import { calculateProductAvailability } from '../src/lib/inventoryUtils';

async function test() {
  const [productsRes, recipesRes, stockRes, subRecipeRes] = await Promise.all([
    supabase.from('products').select('*').ilike('name', '%Volcano%'),
    supabase.from('recipes').select('*'),
    supabase.from('stock_items').select('*'),
    supabase.from('sub_recipe_ingredients').select('*')
  ]);
  const res = calculateProductAvailability(productsRes.data as any, recipesRes.data as any, stockRes.data as any, subRecipeRes.data as any);
  const pId = productsRes.data![0].id;
  console.log('Product availability:', res.productAvailability[pId]);
  
  // Now simulate Beef slice (1620) is 0
  const modifiedStock = stockRes.data!.map(s => s.id === 1620 ? { ...s, current_stock: 0 } : s);
  const res2 = calculateProductAvailability(productsRes.data as any, recipesRes.data as any, modifiedStock, subRecipeRes.data as any);
  console.log('Product availability after Beef=0:', res2.productAvailability[pId]);
  
  console.log('Variants after Beef=0:');
  for (const k in res2.variantAvailability) {
    if (k.startsWith(pId)) console.log(k.split('::')[1], ':', res2.variantAvailability[k]);
  }
}
test();
