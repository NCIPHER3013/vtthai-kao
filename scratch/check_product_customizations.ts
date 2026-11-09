import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: prod } = await supabase.from('products').select('*').eq('name', 'Stir Fried Cashew Nut').single();
  console.log("Stir Fried Cashew Nut customizations:", JSON.stringify(prod?.customizations, null, 2));
}

main().catch(console.error);
