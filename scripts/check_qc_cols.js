const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name='qc_inspection_batches'"))
  .then(res => console.log(res.rows))
  .finally(() => client.end());
