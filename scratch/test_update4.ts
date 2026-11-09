import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const id = '30fd5eb0-db97-44ba-8b7e-bb02f29b1f02'; // ID of Seafood
  const { data: before } = await supabase.from('recipes').select('quantity').eq('id', id).single();
  console.log('Before:', before);
  
  const { error } = await supabase.from('recipes').update({ quantity: 1.5 }).eq('id', id);
  console.log('Update Error:', error);

  const { data: after } = await supabase.from('recipes').select('quantity').eq('id', id).single();
  console.log('After:', after);
}
test();
