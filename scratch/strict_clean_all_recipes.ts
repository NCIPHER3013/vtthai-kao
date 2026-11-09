import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ilzhkgiabwfsvgvuwnbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== STRICT CLEANUP: REMOVING ALL UNWRITTEN DUCK VARIANTS & EXTRA INGREDIENTS ===");

  const { data: recipes } = await supabase.from('recipes').select('*, products(*)');
  
  if (!recipes) return;

  // 1. Delete ANY recipe row where variant is 'Duck', EXCEPT for 'Red Duck Curry' (#30)
  for (const r of recipes) {
    const prodName = (r as any).products?.name || '';
    if (r.variant === 'Duck' && !prodName.toLowerCase().includes('red duck curry')) {
      console.log(`🗑️ Deleting unwritten Duck variant from product "${prodName}" (Recipe ID: ${r.id})`);
      await supabase.from('recipes').delete().eq('id', r.id);
    }
  }

  // 2. Double-check all products and ensure no unwritten variants or items exist
  const { data: remainingRecipes } = await supabase.from('recipes').select('*, stock_items(*)');
  const { data: products } = await supabase.from('products').select('*');

  console.log("\n=== FINAL AUDIT OF ALL RECIPES IN DATABASE ===\n");

  const productMap = new Map<string, any[]>();
  remainingRecipes?.forEach(r => {
    const pId = r.product_id;
    if (!productMap.has(pId)) productMap.set(pId, []);
    productMap.get(pId)?.push(r);
  });

  for (const prod of products || []) {
    const recs = productMap.get(prod.id) || [];
    if (recs.length > 0) {
      console.log(`📦 "${prod.name}" (${recs.length} recipe entries):`);
      recs.forEach(r => {
        const stName = (r as any).stock_items?.name;
        const stUnit = (r as any).stock_items?.unit;
        console.log(`   - Variant: "${r.variant || 'Base'}" ➔ Stock: "${stName}" (${r.quantity} ${stUnit})`);
      });
      console.log("------------------------------------------------------------------");
    }
  }

  console.log("\n=== STRICT CLEANUP COMPLETED SUCCESSFULLY ===");
}

main().catch(console.error);
