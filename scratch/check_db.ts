import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDb() {
    console.log('--- Database Check ---');
    
    const tables = ['stock_items', 'products', 'recipes', 'staff_pins', 'product_categories', 'suppliers', 'item_suppliers', 'sub_recipe_ingredients'];
    
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.error(`Error querying ${table}:`, error.message);
        } else {
            console.log(`${table}: ${count} rows`);
        }
    }

    // Check for products with missing categories or zero price
    const { data: badProducts } = await supabase.from('products').select('name, price').eq('price', 0);
    console.log(`\nProducts with $0 price: ${badProducts?.length || 0}`);
    if (badProducts && badProducts.length > 0) {
        console.log(badProducts.map(p => p.name).join(', '));
    }

    // Check recipes for any missing links
    const { data: recipes } = await supabase.from('recipes').select('product_name, ingredient_name, quantity, variant');
    const zeroQtyRecipes = recipes?.filter(r => !r.quantity || r.quantity <= 0);
    console.log(`\nRecipes with 0 or missing quantity: ${zeroQtyRecipes?.length || 0}`);
    
    // Any other anomalies
}

checkDb();
