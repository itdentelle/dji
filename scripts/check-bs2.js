require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const bsRows = rows.filter(r => String(r['FInal Inspeksi'] || '').toUpperCase() === 'BS');
  console.log("Excel rows with FInal Inspeksi == 'BS':", bsRows.length);
  if (bsRows.length > 0) {
    console.log("They are:", bsRows.map(r => ({ id: r['ID'], pcs: r['Jml Hasil Produksi'] })));
  }

}
run();
