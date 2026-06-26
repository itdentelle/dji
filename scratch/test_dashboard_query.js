require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split("T")[0];

    const { data: rawHeaders, error: headerError } = await supabase
      .from("production_headers")
      .select(`
        id, tgl, operator_id, rpm, pcs, pic, nomor_mc, total_produksi_meter, total_downtime_menit, design_id,
        groups ( nama_grup ),
        operators ( nama_operator ),
        production_details (
          id, jml_hasil_produksi, kategori_masalah, meter_kain, final_inspection_id
        )
      `)
      .gte("tgl", dateLimit);

    console.log(JSON.stringify(rawHeaders, null, 2));
}
check();
