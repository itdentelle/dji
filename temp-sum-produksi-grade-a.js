const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // read as array of arrays

let totalProduksiGradeA = 0;
// start from 1 to skip header
const headerRow = data[0];
const colIndex = headerRow.findIndex(h => typeof h === 'string' && h.trim() === 'Jml Hasil Produksi');

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  
  // check if any cell in the row contains "GRADE A" (case insensitive)
  const isGradeA = row.some(cell => {
    if (typeof cell === 'string') {
      return cell.toUpperCase() === 'GRADE A' || cell.toUpperCase().includes('GRADE A');
    }
    return false;
  });

  if (isGradeA) {
    if (colIndex !== -1 && row[colIndex] !== undefined && row[colIndex] !== null) {
      const val = parseFloat(row[colIndex]);
      if (!isNaN(val)) {
        totalProduksiGradeA += val;
      }
    }
  }
}

console.log(`Total Jml Hasil Produksi (Grade A saja): ${totalProduksiGradeA}`);
