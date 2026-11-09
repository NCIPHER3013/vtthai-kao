import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const stockRes = await supabase.from('stock_items').select('*').in('id', [2301, 2292, 2293, 1622, 1620, 2291]);
  console.log(stockRes.data);
}
test();
