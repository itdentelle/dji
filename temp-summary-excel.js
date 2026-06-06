const xlsx = require('xlsx');

function run() {
  console.log("Reading Excel file...");
  const workbook = xlsx.readFile('DATA BASE SYSTEM (1).xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  
  let totalData = rows.length;
  let summary = {
    totalRecords: totalData,
    dateRange: { min: null, max: null },
    groups: {},
    inspections: {},
    designs: {},
    operators: {},
    problems: {
      ELECTRIC: 0, MEKANIK: 0, 'ELEMENT RAJUTAN': 0, 'BAHAN BAKU': 0, 
      'MAINTENANCE/PERAWATAN': 0, 'GANTI DESIGN': 0, 'GANTI BENANG': 0, 'MESIN STOP': 0
    },
    totalPcs: 0,
    totalJmlHasilProduksi: 0
  };

  const excelDateToJSDate = (serial) => {
    if (!serial) return null;
    if (typeof serial !== 'number') return new Date(serial);
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;                                        
    return new Date(utc_value * 1000);
  };

  rows.forEach(row => {
    // Dates
    let date = null;
    if (row['Tgl']) {
      date = excelDateToJSDate(row['Tgl']);
    } else if (row['Tanggal']) {
      date = excelDateToJSDate(row['Tanggal']);
    }
    if (date && !isNaN(date.getTime())) {
      if (!summary.dateRange.min || date < summary.dateRange.min) summary.dateRange.min = date;
      if (!summary.dateRange.max || date > summary.dateRange.max) summary.dateRange.max = date;
    }

    // Numbers
    if (row['PCS']) summary.totalPcs += Number(row['PCS']) || 0;
    if (row['Jml Hasil Produksi']) summary.totalJmlHasilProduksi += Number(row['Jml Hasil Produksi']) || 0;

    // Groups
    let grup = row['Grup'] || 'Unknown';
    summary.groups[grup] = (summary.groups[grup] || 0) + 1;

    // Inspections
    let insp = row['FInal Inspeksi'] || 'Belum Diinspeksi';
    summary.inspections[insp] = (summary.inspections[insp] || 0) + 1;

    // Designs
    let design = row['Design'] || 'Unknown';
    summary.designs[design] = (summary.designs[design] || 0) + 1;

    // Operators
    let operator = row['  Nama Operator'] || row['Nama Operator'] || 'Unknown';
    summary.operators[operator] = (summary.operators[operator] || 0) + 1;

    // Problems
    const problemKeys = ['ELECTRIC', 'MEKANIK', 'ELEMENT RAJUTAN', 'BAHAN BAKU', 'MAINTENANCE/PERAWATAN', 'GANTI DESIGN', 'GANTI BENANG', 'MESIN STOP'];
    for (const prob of problemKeys) {
      if (row[` MASALAH ${prob}`]) {
        summary.problems[prob]++;
      }
    }
  });

  console.log(JSON.stringify(summary, null, 2));
}

run();
