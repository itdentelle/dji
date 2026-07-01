const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clearDB() {
  console.log('Fetching counts before deletion...');
  
  const tables = [
    'surat_jalan_items', 'surat_jalan', 
    'mending_items', 'mending_batches', 
    'qc_inspection_items', 'qc_inspection_batches', 
    'production_details', 'production_headers'
  ];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`Table ${table}: ${count} rows`);
  }

  console.log('Clearing database...');

  // delete all rows by using a filter that always matches
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) {
       console.error(`Error clearing ${table}:`, error.message);
    } else {
       console.log(`Cleared ${table}`);
    }
  }

  console.log('Fetching counts after deletion...');
  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`Table ${table}: ${count} rows`);
  }
}

clearDB();
