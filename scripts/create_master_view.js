const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to Postgres');

    const createViewQuery = `
      CREATE OR REPLACE VIEW public.master_data_view AS
      SELECT
        ph.id AS id_laporan,
        ph.tgl AS tanggal_produksi,
        ph.tanggal_jam AS tanggal_jam,
        ph.tanggal_potong AS tanggal_potong,
        ph.nomor_mc AS mesin,
        ph.pick AS pick,
        ph.course AS course,
        ph.rpm AS rpm,
        COALESCE(ph.pic, o.nama_operator) AS operator,
        COALESCE(g.nama_grup, ph.group_id::text) AS grup,
        ph.design_id AS design,
        ph.panel_no AS panel,
        ph.potongan_ke AS potongan_ke,
        ph.no_order_barang AS no_order,
        ph.no_customer AS no_customer,
        ph.total_downtime_detik AS total_downtime_detik,
        ph.meter_awal AS meter_awal,
        ph.meter_akhir AS meter_akhir,
        ph.total_produksi_meter AS total_produksi_meter,
        pd.pcs_index AS pcs_ke,
        pd.jml_hasil_produksi AS hasil_pcs,
        pd.meter_kain AS meter_kain,
        CASE WHEN pd.indikator_stop = true THEN 'Ya' ELSE 'Tidak' END AS mesin_stop,
        pd.kategori_masalah AS kategori_masalah,
        pd.detail_masalah AS detail_masalah,
        pd.spesifik_masalah AS spesifik_masalah,
        pd.keterangan_cacat AS keterangan_cacat,
        qb.petugas_inspeksi AS petugas_qc1,
        qb.petugas_inspeksi_2 AS petugas_qc2,
        qb.tanggal_inspeksi AS tanggal_qc,
        CASE 
          WHEN qb.start_inspect IS NOT NULL AND qb.finish_inspect IS NOT NULL THEN (qb.start_inspect || ' - ' || qb.finish_inspect)
          ELSE NULL 
        END AS waktu_qc,
        pd.status_inspeksi AS hasil_qc,
        qb.berat_kain AS berat_kain,
        pd.keterangan_qc AS keterangan_qc,
        mb.petugas_mending AS petugas_mending,
        CASE 
          WHEN mb.start_mending IS NOT NULL AND mb.finish_mending IS NOT NULL THEN (mb.start_mending || ' - ' || mb.finish_mending)
          ELSE NULL 
        END AS waktu_mending,
        ph.status_matching AS status_matching,
        NULL AS prod_ceklis,
        NULL AS prod_silang,
        qb.inspeksi_ceklis AS qc_ceklis,
        qb.inspeksi_silang AS qc_silang,
        mb.tanggal_mending AS tanggal_mending,
        mi.hasil_mending AS hasil_mending,
        mb.keterangan_mending AS keterangan_mending,
        ph.created_by_name AS penanggung_jawab,
        CASE 
          WHEN ph.downtime_events IS NOT NULL AND jsonb_typeof(ph.downtime_events::jsonb) = 'array' 
          THEN jsonb_array_length(ph.downtime_events::jsonb) 
          ELSE 0 
        END AS frekuensi_masalah
      FROM production_details pd
      JOIN production_headers ph ON pd.header_id = ph.id
      LEFT JOIN operators o ON ph.operator_id = o.id
      LEFT JOIN groups g ON ph.group_id = g.id
      LEFT JOIN qc_inspection_items qi ON pd.id = qi.production_detail_id
      LEFT JOIN qc_inspection_batches qb ON qi.batch_id = qb.id
      LEFT JOIN mending_items mi ON pd.id = mi.production_detail_id
      LEFT JOIN mending_batches mb ON mi.batch_id = mb.id;
    `;

    await client.query(createViewQuery);
    console.log('Successfully created master_data_view');

  } catch (err) {
    console.error('Error creating view:', err);
  } finally {
    await client.end();
  }
}

run();
