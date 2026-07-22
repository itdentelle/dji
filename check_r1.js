require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('production_headers')
    .select('id, nomor_mc, tgl, tanggal_jam, downtime_events')
    .eq('nomor_mc', 'R1')
    .gte('tgl', '2026-06-22')
    .order('tanggal_jam', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Last 10 panels for R1:');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkData();
