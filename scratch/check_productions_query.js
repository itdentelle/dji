require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
        .from("productions")
        .select(`
          id,
          tgl,
          rpm,
          pcs,
          jml_hasil_produksi,
          status_inspeksi,
          operator_id,
          final_inspection_id,
          final_inspections (
            status_final
          ),
          operators (
            nama_operator
          ),
          designs (
            nama_design
          ),
          groups (
            nama_grup
          ),
          production_problems (
            id
          )
        `).limit(1);
  console.log(error || "Success");
}
check();
