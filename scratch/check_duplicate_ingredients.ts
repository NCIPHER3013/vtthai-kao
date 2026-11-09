import { config } from 'dotenv';
config({ path: '.env.local' });

async function checkDuplicates() {
  const { supabase } = await import('../src/lib/supabase');
  
  const { data: stockItems, error } = await supabase
    .from('stock_items')
    .select('*')
    .order('name');
    
  if (error) {
    console.error('Error fetching stock items:', error);
    return;
  }
  
  if (!stockItems || stockItems.length === 0) {
    console.log('No stock items found.');
    return;
  }
  
  console.log(`Total stock items: ${stockItems.length}`);
  
  // Find duplicates by name (case-insensitive and trimming spaces)
  const nameMap = new Map<string, any[]>();
  
  for (const item of stockItems) {
    const normalizedName = item.name.toLowerCase().trim();
    if (!nameMap.has(normalizedName)) {
      nameMap.set(normalizedName, []);
    }
    nameMap.get(normalizedName)!.push(item as any);
  }
  
  let duplicateCount = 0;
  for (const [name, items] of nameMap.entries()) {
    if (items.length > 1) {
      duplicateCount++;
      console.log(`\nDuplicate found for "${name}":`);
      items.forEach(i => {
        console.log(`  - ID: ${i.id}, Name: "${i.name}", Category: ${i.category}, Unit: ${i.unit}`);
      });
    }
  }
  
  if (duplicateCount === 0) {
    console.log('\nNo duplicate stock items found based on name.');
  } else {
    console.log(`\nFound ${duplicateCount} sets of duplicate items.`);
  }
}

checkDuplicates().catch(console.error);
