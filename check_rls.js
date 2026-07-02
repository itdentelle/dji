const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  await client.connect();
  const { rows } = await client.query("SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'");
  console.log(rows);
  await client.end();
})();
