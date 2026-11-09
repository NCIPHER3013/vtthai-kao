import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Get connection string from .env
const env = fs.readFileSync('.env', 'utf-8');
const dbUrlMatch = env.match(/DATABASE_URL="([^"]+)"/);
const connectionString = dbUrlMatch ? dbUrlMatch[1] : '';

if (!connectionString) {
  console.error("No DATABASE_URL found.");
  process.exit(1);
}

const client = new Client({ connectionString });

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to DB. Altering settings table...');
    
    // Attempt to add columns to settings table
    await client.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS holiday_surcharge NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS eftpos_surcharge NUMERIC DEFAULT 0;
    `);
    console.log('Columns added successfully.');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

migrate();
