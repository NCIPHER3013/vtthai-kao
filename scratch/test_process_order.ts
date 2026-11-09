import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  const { data, error } = await supabase.rpc('process_order', {
    p_order_id: 'test-order-' + Date.now(),
    p_subtotal: 100,
    p_tax: 7,
    p_total: 107,
    p_payment_method: 'CASH',
    p_order_type: 'delivery',
    p_timestamp: new Date().toISOString(),
    p_status: 'pending',
    p_customer_id: null,
    p_customer_name: 'Test Name',
    p_shift_id: null,
    p_items: [{ product_id: 'prod-1', quantity: 1, note: null, modifiers: [] }],
    p_delivery_address: 'Test Addr',
    p_delivery_phone: '123456789'
  });
  console.log('Data:', data);
  console.log('Error:', error);
}
testRpc();
