const xlsx = require("xlsx");

try {
  const wb = xlsx.readFile("DATA POTONG KAIN TAHUN 2026 (13).xlsx");
  const stmSamples = new Set();
  const djiSamples = new Set();
  
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
    
    let obStmIdx = -1;
    let obDjiIdx = -1;
    let headerRowIdx = -1;
    
    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (Array.isArray(row)) {
        for (let j = 0; j < row.length; j++) {
          if (typeof row[j] === "string") {
            if (row[j].toUpperCase().includes("OB STM")) obStmIdx = j;
            if (row[j].toUpperCase().includes("OB DJI")) obDjiIdx = j;
          }
        }
        if (obStmIdx !== -1 && obDjiIdx !== -1) {
          headerRowIdx = i;
          break;
        }
      }
    }

    if (headerRowIdx !== -1) {
      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i];
        if (!row) continue;
        const stm = row[obStmIdx];
        const dji = row[obDjiIdx];
        
        if (stm) stmSamples.add(stm);
        if (dji) djiSamples.add(dji);
      }
    }
  }

  console.log("All OB STM Samples (top 20):", Array.from(stmSamples).slice(0, 20));
  console.log("All OB DJI Samples (top 20):", Array.from(djiSamples).slice(0, 20));

} catch (err) {
  console.error(err);
}
