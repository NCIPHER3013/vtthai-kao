import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const connectionString = process.env.VITE_SUPABASE_DB_URL;
if (!connectionString) throw new Error('Set VITE_SUPABASE_DB_URL to the Postgres connection string');

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    const sqlPath = join(dirname(fileURLToPath(import.meta.url)), 'create_online_ordering.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    console.log('Applying online ordering migration...');
    await client.query(sql);
    console.log('Online ordering migration applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
