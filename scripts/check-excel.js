require('dotenv').config({ path: '.env.local' });
const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet);

let countMasalah = 0;
let countProduksi = 0;
const problemKeys = ['ELECTRIC', 'MEKANIK', 'ELEMENT RAJUTAN', 'BAHAN BAKU', 'MAINTENANCE/PERAWATAN', 'GANTI DESIGN', 'GANTI BENANG', 'MESIN STOP'];

for (const row of rows) {
  if (row['Jml Hasil Produksi']) countProduksi += row['Jml Hasil Produksi'];
  let hasProb = false;
  for (const prob of problemKeys) {
    const val = row[` MASALAH ${prob}`];
    if (val) {
      if (!hasProb) countMasalah++;
      hasProb = true;
    }
  }
}

console.log('Total Jml Hasil Produksi in Excel:', countProduksi);
console.log('Total rows with at least one problem in Excel (naïve check):', countMasalah);

let sampleProblems = [];
for (const row of rows) {
  for (const prob of problemKeys) {
    const val = row[` MASALAH ${prob}`];
    if (val) {
      sampleProblems.push(val);
    }
  }
}
console.log('Sample problem cell values:', [...new Set(sampleProblems)].slice(0, 10));
