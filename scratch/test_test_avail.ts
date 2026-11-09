import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';
import { calculateProductAvailability } from '../src/lib/inventoryUtils';

async function test() {
  const [productsRes, recipesRes, stockRes, subRecipeRes] = await Promise.all([
    supabase.from('products').select('*').eq('name', 'test'),
    supabase.from('recipes').select('*'),
    supabase.from('stock_items').select('*'),
    supabase.from('sub_recipe_ingredients').select('*')
  ]);
  const res = calculateProductAvailability(productsRes.data as any, recipesRes.data as any, stockRes.data as any, subRecipeRes.data as any);
  const pId = productsRes.data![0].id;
  console.log('Product availability for test:', res.productAvailability[pId]);
}
test();
