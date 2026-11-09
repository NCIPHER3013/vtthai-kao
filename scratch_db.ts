import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path:'.env.local'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const o = await supabase.from('orders').select('id, customer_name, status, order_type').in('status', ['pending', 'preparing', 'ready']);
  console.log('Orders:', o.data);
  const s = await supabase.from('table_sessions').select('table_id, status').eq('status', 'active');
  console.log('Sessions:', s.data);
}
run();
