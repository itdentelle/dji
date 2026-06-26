require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  await supabase.from('production_headers').update({ is_synced_to_sheet: false }).neq('id', '0');
  console.log("Reset is_synced_to_sheet to false for all records!");
}

run();
