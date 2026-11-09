import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: subRecipeIngr, error } = await supabase.from('sub_recipe_ingredients').select('*');
  console.log("sub_recipe_ingredients table error:", error);
  console.log("sub_recipe_ingredients current rows count:", subRecipeIngr?.length);
  if (subRecipeIngr && subRecipeIngr.length > 0) {
    console.log("Sample row:", subRecipeIngr[0]);
  }
}

main().catch(console.error);
