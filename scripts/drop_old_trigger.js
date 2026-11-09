import pg from 'pg';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const client = new pg.Client({ connectionString: env.match(/DATABASE_URL="([^"]+)"/)[1] });

async function fix() {
  await client.connect();
  try {
    await client.query("DROP TRIGGER IF EXISTS trigger_deduct_inventory ON order_items;");
    await client.query("DROP FUNCTION IF EXISTS deduct_inventory_on_order();");
    console.log("Old trigger dropped successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
fix();
