require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncOldData() {
  console.log("Fetching data from Supabase...");
  
  // Ambil semua header dan details
  const { data: headers, error } = await supabase
    .from("production_headers")
    .select(`
      *,
      groups(nama_grup),
      operators(nama_operator),
      production_details(*)
    `)
    // hanya ambil data yang dibuat hari ini, atau bisa dibilang seluruh data karena baru di-wipe
    .order('tanggal_jam', { ascending: true });

  if (error) {
    console.error("Gagal mengambil data dari Supabase:", error);
    return;
  }

  if (!headers || headers.length === 0) {
    console.log("Tidak ada data yang ditemukan di database.");
    return;
  }

  console.log(`Ditemukan ${headers.length} laporan untuk disinkronisasi...`);

  const payloads = [];

  for (const h of headers) {
    const details = h.production_details || [];
    
    for (const detail of details) {
      payloads.push({
        "ID Laporan": h.id,
        "Tanggal Produksi": h.tgl || "",
        "Tanggal & Jam": h.tanggal_jam || "",
        "Tanggal Potong": h.tanggal_potong || "",
        "Mesin": h.nomor_mc || "",
        "Pick": h.pick || "",
        "Course": h.course || "",
        "RPM": h.rpm || "",
        "Operator": h.pic || (h.operators && h.operators.nama_operator) || "",
        "Grup": (h.groups && h.groups.nama_grup) || h.group_id || "",
        "Design": h.design_id || "",
        "Panel": h.panel_no || "",
        "Potongan Ke": h.potongan_ke || "",
        "No Order": h.no_order_barang || "",
        "No Customer": h.no_customer || "",
        "Total Downtime (Menit)": h.total_downtime_menit || 0,
        "Meter Awal": h.meter_awal || "",
        "Meter Akhir": h.meter_akhir || "",
        "Total Produksi Meter": h.total_produksi_meter || "",
        "PCS Ke": detail.pcs_index || "",
        "Hasil PCS": detail.jml_hasil_produksi || 0,
        "Meter Kain": detail.meter_kain || "",
        "Roll No": detail.roll_no || "",
        "Mesin Stop?": detail.indikator_stop ? "Ya" : "Tidak",
        "Kategori Masalah": detail.kategori_masalah || "",
        "Detail Masalah": detail.detail_masalah || "",
        "Keterangan Cacat": detail.keterangan_cacat || ""
      });
    }
  }

  console.log(`Mempersiapkan pengiriman ${payloads.length} baris detail ke Google Sheets...`);
  
  if (payloads.length > 0) {
    try {
      const response = await fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads)
      });
      console.log("Status Respon Sheet:", response.status);
      const txt = await response.text();
      console.log("Respon Body:", txt);
      console.log("Berhasil menyinkronkan data yang terlewat!");
    } catch (err) {
      console.error("Gagal push ke Google Sheets:", err);
    }
  }
}

syncOldData();
