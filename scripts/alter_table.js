const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL.");

    const query = `
      ALTER TABLE productions
      ADD COLUMN IF NOT EXISTS tanggal_potong text,
      ADD COLUMN IF NOT EXISTS pick text,
      ADD COLUMN IF NOT EXISTS no_order_barang text,
      ADD COLUMN IF NOT EXISTS roll_no text,
      ADD COLUMN IF NOT EXISTS jenis_benang_dasar text,
      ADD COLUMN IF NOT EXISTS liner text,
      ADD COLUMN IF NOT EXISTS heavy text,
      ADD COLUMN IF NOT EXISTS shadow text,
      ADD COLUMN IF NOT EXISTS pinggiran text;
    `;

    await client.query(query);
    console.log("Success! Columns have been added to 'productions' table.");
  } catch (error) {
    console.error("Error executing query:", error);
  } finally {
    await client.end();
  }
}

addColumns();
