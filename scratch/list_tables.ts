import { supabase } from '../src/lib/supabase';

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work if RPC doesn't exist
  if (error) {
    // Fallback: try to query common table names or use a query that lists tables
    const { data: tables, error: tablesError } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      console.log('Tables:', tables.map(t => t.table_name));
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
