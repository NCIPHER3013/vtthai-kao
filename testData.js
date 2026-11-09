import { supabase } from './src/lib/supabase.js';

async function test() {
    const { data } = await supabase.from('products').select('*').eq('is_active', true);
    console.log(data);
}
test();
