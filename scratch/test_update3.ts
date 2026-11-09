import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function test() {
  const { data: r } = await supabase.from('recipes').select('*').limit(1);
  const id = r[0].id;
  console.log('Updating ID:', id);

  const res1 = await supabase.from('recipes').update({ quantity: 1.1 }).eq('id', id);
  console.log('Without select/single:', res1.error);

  const res2 = await supabase.from('recipes').update({ quantity: 1.2 }).eq('id', id).select('*');
  console.log('With select:', res2.error, res2.data?.length);

  const res3 = await supabase.from('recipes').update({ quantity: 1.3 }).eq('id', id).select('*').single();
  console.log('With select and single:', res3.error?.code);
}
test();
