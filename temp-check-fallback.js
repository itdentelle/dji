const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const headerRow = data[0];
const colJmlProduksi = headerRow.findIndex(h => typeof h === 'string' && h.trim() === 'Jml Hasil Produksi');
const colFinalInspeksi = headerRow.findIndex(h => typeof h === 'string' && h.trim() === 'FInal Inspeksi');

let explicitGradeA = 0;
let emptyGradeAsGradeA = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  
  if (colJmlProduksi !== -1 && row[colJmlProduksi] !== undefined && row[colJmlProduksi] !== null) {
    const val = parseFloat(row[colJmlProduksi]);
    if (!isNaN(val) && val > 0) {
      
      const finalInsp = row[colFinalInspeksi];
      let isGradeA = false;
      let isEmpty = false;

      if (typeof finalInsp === 'string') {
        const up = finalInsp.toUpperCase().trim();
        if (up === 'GRADE A' || up === 'A') {
          isGradeA = true;
        } else if (up === '') {
          isEmpty = true;
        }
      } else if (finalInsp === undefined || finalInsp === null) {
        isEmpty = true;
      }

      if (isGradeA) {
        explicitGradeA += val;
      }
      if (isEmpty) {
        emptyGradeAsGradeA += val;
      }
    }
  }
}

console.log(`Explicit Grade A Jml Hasil Produksi: ${explicitGradeA}`);
console.log(`Empty/Null (Fallback to Grade A): ${emptyGradeAsGradeA}`);
console.log(`Total if fallback included: ${explicitGradeA + emptyGradeAsGradeA}`);
