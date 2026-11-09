import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data: orders } = await supabase.from('orders').select('*').ilike('customer_name', '%T-55%').order('timestamp', { ascending: false }).limit(5);
  console.log('Orders:', orders);
  
  if (orders && orders.length > 0) {
    for (const ord of orders) {
       const { data: items } = await supabase.from('order_items').select('*').eq('order_id', ord.id);
       console.log('Order', ord.id, 'Items:', items);
    }
  }
}
test();
