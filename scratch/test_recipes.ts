import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data: p } = await supabase.from('products').select('*').eq('name', 'test');
  const { data: r } = await supabase.from('recipes').select('*').eq('product_id', p![0].id);
  console.log(r);
}
test();
