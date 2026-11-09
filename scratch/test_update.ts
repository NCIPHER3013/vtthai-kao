import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data, error } = await supabase.from('recipes').update({ quantity: 1 }).eq('id', '30fd5eb0-db97-44ba-8b7e-bb02f29b1f02');
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
