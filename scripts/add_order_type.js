import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const client = new pg.Client({ connectionString: env.match(/DATABASE_URL="([^"]+)"/)[1] });

async function addOrderType() {
  await client.connect();
  try {
    await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in';");
    console.log("Added order_type to orders.");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

addOrderType();
