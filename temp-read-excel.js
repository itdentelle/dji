const xlsx = require('xlsx');

const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // read as array of arrays to see headers

console.log(`Sheet Name: ${sheetName}`);
console.log(`Total Rows: ${data.length}`);
console.log('--- Columns (Row 0) ---');
console.log(data[0]);
console.log('--- First Data Row (Row 1) ---');
console.log(data[1]);
console.log('--- Second Data Row (Row 2) ---');
console.log(data[2]);
