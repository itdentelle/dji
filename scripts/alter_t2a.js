const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to Postgres');

    // Add target_meter
    await client.query(`ALTER TABLE public.production_headers ADD COLUMN IF NOT EXISTS target_meter numeric;`);
    console.log('Added target_meter column');

    // Add sisa_meter
    await client.query(`ALTER TABLE public.production_headers ADD COLUMN IF NOT EXISTS sisa_meter numeric;`);
    console.log('Added sisa_meter column');

  } catch (err) {
    console.error('Error running migrations:', err);
  } finally {
    await client.end();
  }
}

run();
