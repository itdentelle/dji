const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const headerRow = data[0];
const colJmlProduksi = headerRow.findIndex(h => typeof h === 'string' && h.trim() === 'Jml Hasil Produksi');
const colFinalInspeksi = headerRow.findIndex(h => typeof h === 'string' && h.trim() === 'FInal Inspeksi');

const masalahCols = [];
for (let i = 0; i < headerRow.length; i++) {
  if (typeof headerRow[i] === 'string' && headerRow[i].includes('MASALAH') && !headerRow[i].includes('Keterangan')) {
    masalahCols.push(i);
  }
}

let problemsTotal = 0;
let problemsWithProduction = 0;
let problemsWithoutProduction = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  
  let rowHasProblem = false;
  for (const colIdx of masalahCols) {
    if (row[colIdx] !== undefined && row[colIdx] !== null && row[colIdx] !== '') {
      rowHasProblem = true;
      break;
    }
  }

  if (rowHasProblem) {
    problemsTotal++;
    let hasProd = false;
    if (colJmlProduksi !== -1 && row[colJmlProduksi] !== undefined && row[colJmlProduksi] !== null) {
      const val = parseFloat(row[colJmlProduksi]);
      if (!isNaN(val) && val > 0) {
        hasProd = true;
      }
    }
    
    if (hasProd) {
      problemsWithProduction++;
    } else {
      problemsWithoutProduction++;
    }
  }
}

console.log(`Total baris bermasalah: ${problemsTotal}`);
console.log(`Baris bermasalah DENGAN Jml Hasil Produksi > 0: ${problemsWithProduction}`);
console.log(`Baris bermasalah TANPA Jml Hasil Produksi (0 atau kosong): ${problemsWithoutProduction}`);
