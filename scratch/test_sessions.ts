import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data } = await supabase.from('table_sessions').select('*').eq('status', 'active');
  console.log('Active Sessions:', data);
  if (data && data.length > 0) {
    for (const session of data) {
       // Wait, is there a session_id on order_items? Or orders?
       // Let's check how cart items are associated with sessions.
       const { data: orders } = await supabase.from('orders').select('*').eq('table_session_id', session.id);
       console.log('Session', session.table_name, 'Orders:', orders);
    }
  }
}
test();
