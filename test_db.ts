import { supabase } from './src/lib/supabase';
async function test() {
  const { data, error } = await supabase.from('staff_pins').select('*').limit(1);
  console.log('Error:', error?.message);
  console.log('Data:', data);
}
test();
