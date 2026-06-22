const fs = require('fs');

let content = fs.readFileSync('actions/employee-actions.ts', 'utf8');

// Replace panels array mapping with pcsData array mapping
content = content.replace(
  /const insertData = validated\.panels\.map\(\(panel, idx\) => \{[\s\S]*?\} as any;\s*\}\);/,
  `// Build the array of inserts from pcsData
    const insertData = validated.pcsData.map((pcsItem, idx) => {
      const panelNoNum = validated.panelNo ? parseInt(validated.panelNo) : null;
      const jmlHasilNum = pcsItem.jmlHasilProduksi ? parseInt(pcsItem.jmlHasilProduksi) : null;
      const pcsIndexNum = pcsItem.pcsIndex ? parseInt(pcsItem.pcsIndex) : null;
      
      // Calculate new unique ID per PCS
      const pId = generateExcelStyleId() + "-" + idx;

      return {
        id: pId,
        tgl,
        tanggal_jam: tanggalJam,
        operator_id: operatorIdNum,
        group_id: groupIdNum,
        design_id: designIdNum,
        course: validated.course || null,
        rpm: rpmNum,
        potongan_ke: potonganKeNum,
        panel_no: panelNoNum,
        pcs: pcsIndexNum,
        jml_hasil_produksi: jmlHasilNum,
        ket_pcs: null, // Since we don't have target pcs per se or need to change logic
        status_inspeksi: statusInspeksiBool,
        keterangan: pcsItem.keteranganCacat || null,
        pic: validated.pic || null,
        tanggal_potong: validated.tanggalPotong || null,
        pick: validated.pick || null,
        no_order_barang: validated.noOrderBarang || null,
        roll_no: validated.rollNo || null,
        jenis_benang_dasar: validated.jenisBenangDasar || null,
        liner: validated.liner || null,
        heavy: validated.heavy || null,
        shadow: validated.shadow || null,
        pinggiran: validated.pinggiran || null,
        foto_before: validated.fotoBefore || null,
        foto_after: validated.fotoAfter || null,
      } as any;
    });`
);

fs.writeFileSync('actions/employee-actions.ts', content);
