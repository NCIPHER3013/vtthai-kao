import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const env = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const client = new Client({ connectionString: dbUrlMatch[1] });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name IN ('orders', 'order_items', 'customers', 'shifts')
    ORDER BY table_name, ordinal_position;
  `);
  console.log(res.rows);
  await client.end();
}
check();
