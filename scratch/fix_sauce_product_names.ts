import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== RENAMING SAUCE PRODUCTS TO MATCH IMAGE 7 EXACTLY ===");

  // 1. Rename Large Peanut Sauce -> Extra Large Peanut Sauce
  const { data: peanutProd } = await supabase.from('products').select('*').ilike('name', '%Large Peanut Sauce%').single();
  if (peanutProd) {
    console.log(`Renaming "${peanutProd.name}" -> "Extra Large Peanut Sauce"`);
    await supabase.from('products').update({ name: 'Extra Large Peanut Sauce', category: 'Extras' }).eq('id', peanutProd.id);
  } else {
    console.log("Creating missing Product 'Extra Large Peanut Sauce'");
    await supabase.from('products').insert([{
      id: crypto.randomUUID(),
      name: 'Extra Large Peanut Sauce',
      category: 'Extras',
      price: 5.0,
      color_label: 'bg-emerald-500',
      is_active: true
    }]);
  }

  // 2. Rename Large Chilli Oil -> Extra Large Chili Oil
  const { data: chiliProd } = await supabase.from('products').select('*').ilike('name', '%Large Chill%').single();
  if (chiliProd) {
    console.log(`Renaming "${chiliProd.name}" -> "Extra Large Chili Oil"`);
    await supabase.from('products').update({ name: 'Extra Large Chili Oil', category: 'Extras' }).eq('id', chiliProd.id);
  } else {
    console.log("Creating missing Product 'Extra Large Chili Oil'");
    await supabase.from('products').insert([{
      id: crypto.randomUUID(),
      name: 'Extra Large Chili Oil',
      category: 'Extras',
      price: 5.0,
      color_label: 'bg-emerald-500',
      is_active: true
    }]);
  }

  console.log("✅ SUCCESSFULLY UPDATED PRODUCT NAMES TO 'Extra Large Peanut Sauce' AND 'Extra Large Chili Oil'!");
}

main().catch(console.error);
