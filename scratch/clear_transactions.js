require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  console.log("Clearing QC Data...");
  await supabase.from('qc_problems').delete().neq('id', 0);
  await supabase.from('qc_details').delete().neq('id', 0);
  await supabase.from('qc_inspections').delete().neq('id', 0);

  console.log("Clearing Legacy Production Data...");
  await supabase.from('production_problems').delete().neq('id', 0);
  await supabase.from('productions').delete().neq('id', 0);

  console.log("Clearing New Production Header/Details Data...");
  await supabase.from('production_details').delete().neq('id', 0);
  await supabase.from('production_headers').delete().neq('id', 0);

  console.log("All dummy transaction data successfully cleared!");
}

clearData().catch(console.error);
