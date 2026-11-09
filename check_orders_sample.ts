import { supabase } from './src/lib/supabase';

async function checkOrders() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Orders sample:', data);
  }
}

checkOrders();
