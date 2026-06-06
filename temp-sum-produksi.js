const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // read as array of arrays

let totalProduksi = 0;
// start from 1 to skip header
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  // 'Jml Hasil Produksi' is at index 12 based on previous output
  // but let's find the exact index from the header dynamically just in case
  const headerRow = data[0];
  const colIndex = headerRow.findIndex(h => typeof h === 'string' && h.trim() === 'Jml Hasil Produksi');
  
  if (colIndex !== -1 && row[colIndex] !== undefined && row[colIndex] !== null) {
    // Parse it as float just in case, though it's likely a number
    const val = parseFloat(row[colIndex]);
    if (!isNaN(val)) {
      totalProduksi += val;
    }
  }
}

console.log(`Total Jml Hasil Produksi: ${totalProduksi}`);
