import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function test() {
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
      )
    `)
    .order("tgl", { ascending: false });

  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log("Query Success! Data length:", data?.length);
    console.log("First row:", data?.[0]);
  }
}

test();
