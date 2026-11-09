import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data } = await supabase.from('stock_items').select('*').eq('id', 2308);
  console.log(data);
}
test();
