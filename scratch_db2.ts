import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({path:'.env.local'});
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const t = await supabase.from('tables').select('*');
  console.log('Tables:', t.data);
}
run();
