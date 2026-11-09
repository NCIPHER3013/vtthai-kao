import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data: r } = await supabase.from('recipes').select('*').limit(1);
  const id = r[0].id;
  const { data, error } = await supabase.from('recipes').update({ quantity: 1 }).eq('id', id).select('*').single();
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
