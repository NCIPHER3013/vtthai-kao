import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== REMOVING REDUNDANT 'DUCK' VARIANT ROWS FROM GENERAL DISHES ===");

  // Delete 'Duck' variant rows for dishes where Duck is not listed separately in image
  // (Red Duck Curry #30 keeps its Duck recipe!)
  const { data: recipes } = await supabase.from('recipes').select('*, products(*)').eq('variant', 'Duck');
  
  for (const r of recipes || []) {
    const prodName = (r as any).products?.name || '';
    if (!prodName.toLowerCase().includes('red duck curry')) {
      console.log(`  Deleting redundant 'Duck' variant recipe from "${prodName}"`);
      await supabase.from('recipes').delete().eq('id', r.id);
    }
  }

  console.log("✅ COMPLETED REMOVING REDUNDANT 'DUCK' SECTIONS!");
}

main().catch(console.error);
