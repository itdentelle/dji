const pcsDataToProcess = [{pcsIndex: '1'}, {pcsIndex: '2'}, {pcsIndex: '3'}];
const downtimeEvents = [{ pcsKe: '2', problems: [{ meter: 'PCS 2: 15.5' }] }];

pcsDataToProcess.forEach((pcsItem, idx) => {
  const actualPcsKey = pcsItem.pcsIndex ? pcsItem.pcsIndex.toString() : (idx + 1).toString();
  console.log('actualPcsKey:', actualPcsKey);
  const matchedEvents = downtimeEvents.filter(e => !e.pcsKe || e.pcsKe === 'Semua' || e.pcsKe.split(',').map(x => x.trim()).includes(actualPcsKey));
  console.log('matchedEvents:', matchedEvents);
  
  matchedEvents.forEach(e => {
    e.problems.forEach(p => {
      let meterForThisPcs = '';
      if (p.meter) {
        if (pcsDataToProcess.length === 1) {
          meterForThisPcs = p.meter;
        } else {
          const match = p.meter.match(new RegExp(`PCS ${actualPcsKey}:\\s*([^,]+)`));
          if (match) meterForThisPcs = match[1].trim();
        }
      }
      console.log('meterForThisPcs:', meterForThisPcs);
    });
  });
});
