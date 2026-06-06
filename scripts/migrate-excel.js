require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Excel date to JS Date
function excelDateToJSDate(serial) {
  if (!serial) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

function formatDate(date) {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

async function getOrCreate(table, column, value) {
  if (!value) return null;
  // Try to find
  let { data, error } = await supabase.from(table).select('id').eq(column, value).limit(1).single();
  if (data) return data.id;
  
  // Insert if not found
  let insertObj = {};
  insertObj[column] = value;
  const res = await supabase.from(table).insert([insertObj]).select('id').single();
  if (res.error) {
    console.error(`Error inserting into ${table}:`, res.error);
    return null;
  }
  return res.data.id;
}

// Memory caches
const designCache = {};
const groupCache = {};
const operatorCache = {};
const inspectionCache = {};

// Memory caches for problems
const problemCategoryCache = {};
const problemCache = {};

async function processRow(row) {
  const tglStr = String(row['Tanggal'] || '');
  if (!row['ID']) return null;

  // Handle IDs caching
  let design_id = null;
  if (row['Design']) {
    if (!designCache[row['Design']]) designCache[row['Design']] = await getOrCreate('designs', 'nama_design', row['Design']);
    design_id = designCache[row['Design']];
  }
  let group_id = null;
  if (row['Grup']) {
    if (!groupCache[row['Grup']]) groupCache[row['Grup']] = await getOrCreate('groups', 'nama_grup', String(row['Grup']));
    group_id = groupCache[row['Grup']];
  }
  let operator_id = null;
  if (row['  Nama Operator'] || row['Nama Operator']) {
    const opName = row['  Nama Operator'] || row['Nama Operator'];
    if (!operatorCache[opName]) operatorCache[opName] = await getOrCreate('operators', 'nama_operator', opName);
    operator_id = operatorCache[opName];
  }
  let final_inspection_id = null;
  if (row['FInal Inspeksi']) {
    if (!inspectionCache[row['FInal Inspeksi']]) inspectionCache[row['FInal Inspeksi']] = await getOrCreate('final_inspections', 'status_final', row['FInal Inspeksi']);
    final_inspection_id = inspectionCache[row['FInal Inspeksi']];
  }

  let tanggal_jam = new Date().toISOString();
  if (row['Tanggal']) {
    try {
      tanggal_jam = typeof row['Tanggal'] === 'number' ? excelDateToJSDate(row['Tanggal']).toISOString() : new Date(row['Tanggal']).toISOString();
    } catch(e) {}
  }
  
  let tgl = tanggal_jam.split('T')[0];
  if (row['Tgl']) {
    try {
      tgl = typeof row['Tgl'] === 'number' ? formatDate(excelDateToJSDate(row['Tgl'])) : formatDate(new Date(row['Tgl']));
    } catch(e) {}
  }

  let tanggal_final_inspeksi = null;
  if (row['Tanggal Final Inspeksi']) {
    try {
      tanggal_final_inspeksi = typeof row['Tanggal Final Inspeksi'] === 'number' ? excelDateToJSDate(row['Tanggal Final Inspeksi']).toISOString() : new Date(row['Tanggal Final Inspeksi']).toISOString();
    } catch(e) {}
  }

  // Handle Problems
  let ketArr = [];
  if (row['Keterangan']) ketArr.push(row['Keterangan']);
  
  const problemKeys = ['ELECTRIC', 'MEKANIK', 'ELEMENT RAJUTAN', 'BAHAN BAKU', 'MAINTENANCE/PERAWATAN', 'GANTI DESIGN', 'GANTI BENANG', 'MESIN STOP'];
  let prodProblems = [];
  
  for (const prob of problemKeys) {
    if (row[` MASALAH ${prob}`]) {
      const ket = row[`Keterangan  MASALAH ${prob}`] || '';
      ketArr.push(`${prob}${ket ? ': ' + ket : ''}`);
      
      const catName = `MASALAH ${prob}`;
      if (!problemCategoryCache[catName]) problemCategoryCache[catName] = await getOrCreate('problem_categories', 'nama_kategori', catName);
      const catId = problemCategoryCache[catName];
      
      const probDesc = `Masalah ${prob}`;
      if (!problemCache[probDesc]) {
        let { data } = await supabase.from('problems').select('id').eq('category_id', catId).eq('deskripsi_masalah', probDesc).limit(1).single();
        if (data) {
          problemCache[probDesc] = data.id;
        } else {
          const res = await supabase.from('problems').insert([{ deskripsi_masalah: probDesc, category_id: catId }]).select('id').single();
          if (res.data) problemCache[probDesc] = res.data.id;
        }
      }
      
      prodProblems.push({
        production_id: String(row['ID']),
        problem_id: problemCache[probDesc],
        keterangan_tambahan: ket ? String(ket) : null
      });
    }
  }

  return {
    prod: {
      id: String(row['ID']),
      design_id,
      pic: row['Pic'] ? String(row['Pic']) : null,
      course: row['Course'] ? String(row['Course']) : null,
      rpm: row['Rpm'] || null,
      potongan_ke: row['Potongan Ke'] || null,
      panel_no: row['Panel No'] || null,
      pcs: row['PCS'] || null,
      tanggal_jam,
      tgl,
      group_id,
      operator_id,
      jml_hasil_produksi: row['Jml Hasil Produksi'] || null,
      ket_pcs: row['Ket PCS'] == 1 || row['Ket PCS'] === true,
      status_inspeksi: row['Status Inspeksi'] ? true : false,
      keterangan: ketArr.length > 0 ? ketArr.join(' | ') : null,
      tanggal_final_inspeksi,
      final_inspection_id,
      foto_before: row['Foto Before'] || null,
      foto_after: row['Foto After'] || null,
    },
    probs: prodProblems
  };
}

async function run() {
  console.log("Reading Excel file...");
  const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  console.log(`Found ${rows.length} rows. Mapping and inserting...`);

  let prodBatch = [];
  let probBatch = [];
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const data = await processRow(rows[i]);
    if (data) {
      prodBatch.push(data.prod);
      if (data.probs && data.probs.length > 0) {
        probBatch.push(...data.probs);
      }
    }
    
    // Insert in batches of 100
    if (prodBatch.length === 100 || i === rows.length - 1) {
      if (prodBatch.length > 0) {
        // Upsert productions first
        const { error: pErr } = await supabase.from('productions').upsert(prodBatch, { onConflict: 'id' });
        if (pErr) {
          console.error(`Error inserting batch ending at index ${i}:`, pErr.message);
        } else {
          // Then insert problems (delete existing ones for these productions to avoid duplicates if re-run)
          if (probBatch.length > 0) {
            const prodIds = prodBatch.map(p => p.id);
            await supabase.from('production_problems').delete().in('production_id', prodIds);
            
            const { error: pbErr } = await supabase.from('production_problems').insert(probBatch);
            if (pbErr) {
              console.error(`Error inserting production problems:`, pbErr.message);
            }
          }
          
          totalInserted += prodBatch.length;
          console.log(`Successfully inserted/upserted ${totalInserted}/${rows.length} rows.`);
        }
        prodBatch = [];
        probBatch = [];
      }
    }
  }
  console.log("Migration complete!");
}

run().catch(console.error);
