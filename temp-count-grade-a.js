const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // read as array of arrays

let count = 0;
// start from 1 to skip header
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
    count++;
  }
}

console.log(`Jumlah baris dengan Grade A: ${count}`);
