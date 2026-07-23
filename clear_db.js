import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDB() {
  const tables = [
    'mending_items',
    'qc_inspection_items',
    'qc_inspections',
    'production_defects',
    'production_details',
    'downtime_records',
    'production_headers',
    'production_plans'
  ];

  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) console.error(`Error deleting ${table}:`, error.message);
  }

  console.log("Database cleared successfully!");
}

clearDB();
