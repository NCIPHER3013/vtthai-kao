import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: products } = await supabase.from('products').select('*');

  console.log("=== CHECKING LARGE PEANUT SAUCE & CHILI OIL IN PRODUCTS ===");
  const peanutProds = products?.filter(p => p.name.toLowerCase().includes("peanut"));
  const chiliOilProds = products?.filter(p => p.name.toLowerCase().includes("chili oil") || p.name.toLowerCase().includes("chilli oil"));

  console.log("Peanut Sauce Products:", peanutProds);
  console.log("Chili Oil Products:", chiliOilProds);
}

main().catch(console.error);
