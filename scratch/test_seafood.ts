import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data } = await supabase.from('sub_recipe_ingredients').select('*').eq('parent_item_id', 2291);
  console.log('Sub-recipe for 2291 (Seafood):', data);
  if (data && data.length > 0) {
    const childIds = data.map(d => d.child_item_id);
    const { data: stock } = await supabase.from('stock_items').select('id, name, current_stock').in('id', childIds);
    console.log('Child stock items:', stock);
  }
}
test();
