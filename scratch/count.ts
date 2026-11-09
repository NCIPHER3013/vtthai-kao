import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from '../src/lib/supabase';

async function countItems() {
  const { data: stockItems } = await supabase.from('stock_items').select('unit');
  
  const counts: Record<string, number> = {};
  for (const item of (stockItems || [])) {
    const u = item.unit || 'null/empty';
    counts[u] = (counts[u] || 0) + 1;
  }
  
  console.log('Stock item units:', counts);
}

countItems().catch(console.error);
