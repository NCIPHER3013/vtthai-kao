import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: prod } = await supabase.from('products').select('*').eq('name', 'Lava Spring Roll (4pcs)').single();
  if (prod) {
    console.log("Renaming 'Lava Spring Roll (4pcs)' -> 'Lava Chicken Pop (4pcs)'");
    await supabase.from('products').update({ name: 'Lava Chicken Pop (4pcs)' }).eq('id', prod.id);
  }
}

main().catch(console.error);
