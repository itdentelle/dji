require('dotenv').config({ path: '.env.local' });

const sheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL;

async function testGSheet() {
  const payload = [{
    "ID Laporan": "test-123-nocors",
    "Tanggal Produksi": "2026-06-25",
    "Tanggal & Jam": "2026-06-25 15:30:00",
    "Mesin": "MC-01",
    "Operator": "Testing Bot",
    "Panel": "1",
    "Potongan Ke": "1",
    "Hasil PCS": 1,
    "Mesin Stop?": "Tidak"
  }];

  console.log("Sending payload...");
  try {
    // using direct JSON object format
    const response = await fetch(sheetUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    
    // In browser, no-cors returns opaque response with status 0, but in node it might be different.
    const text = await response.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testGSheet();
