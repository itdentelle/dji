const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const headerRow = data[0];
const colFinalInspeksi = headerRow.findIndex(h => typeof h === 'string' && h.trim() === 'FInal Inspeksi');

// Masalah columns are at even indices starting from 14 to 28 based on previous output
const masalahCols = [];
for (let i = 0; i < headerRow.length; i++) {
  if (typeof headerRow[i] === 'string' && headerRow[i].includes('MASALAH') && !headerRow[i].includes('Keterangan')) {
    masalahCols.push(i);
  }
}

let gradeARowWithProblems = 0;
let gradeATotalProblems = 0;
let allRowWithProblems = 0;

for (let i = 1; i < data.length; i++) {
  const row = data[i];
  
  const finalInsp = row[colFinalInspeksi];
  let isGradeA = false;
  
  if (typeof finalInsp === 'string') {
    const up = finalInsp.toUpperCase().trim();
    if (up === 'GRADE A' || up === 'A') {
      isGradeA = true;
    }
  }

  let rowHasProblem = false;
  let problemCountInRow = 0;

  for (const colIdx of masalahCols) {
    if (row[colIdx] !== undefined && row[colIdx] !== null && row[colIdx] !== '') {
      rowHasProblem = true;
      problemCountInRow++;
    }
  }

  if (rowHasProblem) {
    allRowWithProblems++;
    if (isGradeA) {
      gradeARowWithProblems++;
      gradeATotalProblems += problemCountInRow;
    }
  }
}

console.log(`Kolom masalah terdeteksi: ${masalahCols.length}`);
console.log(`Total baris yg ada masalah (semua grade): ${allRowWithProblems}`);
console.log(`Total baris yg ada masalah khusus Grade A eksplisit: ${gradeARowWithProblems}`);
console.log(`Total kejadian/jumlah masalah khusus Grade A eksplisit: ${gradeATotalProblems}`);
