const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

const stats = {
  totalRows: rows.length,
  missingID: 0,
  missingTanggal: 0,
  missingOperator: 0,
  missingDesign: 0,
  missingGroup: 0,
  missingHasilProduksi: 0,
  zeroHasilProduksi: 0,
  onlyProblemsNoProduksi: 0,
};

const problemKeys = ['ELECTRIC', 'MEKANIK', 'ELEMENT RAJUTAN', 'BAHAN BAKU', 'MAINTENANCE/PERAWATAN', 'GANTI DESIGN', 'GANTI BENANG', 'MESIN STOP'];

for (const row of rows) {
  if (!row['ID']) stats.missingID++;
  if (!row['Tanggal'] && !row['Tgl']) stats.missingTanggal++;
  if (!row['  Nama Operator'] && !row['Nama Operator']) stats.missingOperator++;
  if (!row['Design']) stats.missingDesign++;
  if (!row['Grup']) stats.missingGroup++;
  
  const hasil = row['Jml Hasil Produksi'];
  if (hasil === undefined || hasil === null || hasil === '') {
    stats.missingHasilProduksi++;
  } else if (hasil === 0) {
    stats.zeroHasilProduksi++;
  }

  // Check if it's purely a problem row without production
  let hasProb = false;
  for (const prob of problemKeys) {
    if (row[` MASALAH ${prob}`]) {
      hasProb = true;
      break;
    }
  }

  if (hasProb && (!hasil || hasil === 0)) {
    stats.onlyProblemsNoProduksi++;
  }
}

console.log(JSON.stringify(stats, null, 2));
