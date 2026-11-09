import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data: p } = await supabase.from('products').select('*').eq('name', 'test');
  const { data: r1 } = await supabase.from('recipes').select('*').eq('product_id', p![0].id);
  const { data: r2 } = await supabase.from('recipes').select('*').eq('product_id', p![1].id);
  console.log('Recipes for first test:', r1);
  console.log('Recipes for second test:', r2);
}
test();
