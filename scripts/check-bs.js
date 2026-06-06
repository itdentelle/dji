require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: rawProductions, error } = await supabase
    .from("productions")
    .select(`
      id,
      jml_hasil_produksi,
      final_inspections ( status_final ),
      production_problems ( id )
    `);

  if (error) {
    console.error(error);
    return;
  }

  const bsItems = rawProductions.filter(item => {
    let is_production = (item.jml_hasil_produksi || 0) > 0;
    if (!is_production) return false;

    const hasProblems = item.production_problems && item.production_problems.length > 0;
    let grade = "GRADE A";
    if (item.final_inspections?.status_final) {
      const status = item.final_inspections.status_final.toUpperCase();
      if (status === "GRADE A" || status === "A") grade = "GRADE A";
      else if (status === "GRADE B" || status === "B") grade = "GRADE B";
      else if (status === "BS") grade = "BS";
    } else {
      grade = !hasProblems ? "GRADE A" : "BS";
    }

    return grade === "BS";
  });

  console.log("Total BS rows mapped:", bsItems.length);
  console.log("Total pieces in those rows:", bsItems.reduce((acc, curr) => acc + (curr.jml_hasil_produksi || 0), 0));
  
  const explicitBS = rawProductions.filter(item => item.final_inspections?.status_final?.toUpperCase() === 'BS');
  console.log("Rows with explicit 'BS' in final_inspections:", explicitBS.length);
  
  const fallbackBS = bsItems.filter(item => !(item.final_inspections?.status_final?.toUpperCase() === 'BS'));
  console.log("Rows mapped to BS due to fallback logic:", fallbackBS.length);
  console.log(fallbackBS.slice(0, 5));
}
run();
