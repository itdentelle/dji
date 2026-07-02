const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    await client.connect();
    const { rows } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    for (const row of rows) {
      await client.query(`ALTER TABLE public."${row.tablename}" DISABLE ROW LEVEL SECURITY;`);
      console.log(`Disabled RLS on ${row.tablename}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
