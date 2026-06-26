require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');

async function runMigration() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync('migration_sync_status.sql', 'utf8');
  try {
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}
runMigration();
