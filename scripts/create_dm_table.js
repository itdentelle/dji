const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
console.log('dbUrl exists:', !!dbUrl);

if (!dbUrl) {
  console.log('No DB URL found in env');
  process.exit(0);
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to PG!');
  
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.app_direct_messages (
      id TEXT PRIMARY KEY,
      target_user_id TEXT,
      target_user_name TEXT,
      sender_name TEXT,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_read BOOLEAN DEFAULT FALSE
    );
    ALTER TABLE public.app_direct_messages ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow all direct messages" ON public.app_direct_messages;
    CREATE POLICY "Allow all direct messages" ON public.app_direct_messages FOR ALL USING (true) WITH CHECK (true);
  `);
  
  console.log('Successfully created app_direct_messages table and RLS policies!');
  await client.end();
}

run().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
