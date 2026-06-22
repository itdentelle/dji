const fs = require('fs');

let content = fs.readFileSync('actions/employee-actions.ts', 'utf8');

// Replace everything between const operatorIdNum and // 2. Coba simpan ke database
const searchStr = /const rpmNum = validated\.rpm \? parseInt\(validated\.rpm\) : null;[\s\S]*?\/\/ 2\. Coba simpan ke database Supabase jika terkonfigurasi/;

const replaceStr = `const rpmNum = validated.rpm ? parseInt(validated.rpm) : null;
    const potonganKeNum = validated.potonganKe ? parseInt(validated.potonganKe) : null;
    const pcsNum = validated.pcs ? parseInt(validated.pcs) : null;
    const statusInspeksiBool = null;

    // Build the array of inserts from panels
    const insertData = validated.panels.map((panel, idx) => {
      const panelNoNum = panel.panelNo ? parseInt(panel.panelNo) : null;
      const jmlHasilNum = panel.jmlHasilProduksi ? parseInt(panel.jmlHasilProduksi) : null;
      const ketPcs = (jmlHasilNum !== null && pcsNum !== null) ? (jmlHasilNum >= pcsNum) : null;

      // Calculate new unique ID per panel to avoid duplicates
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
        pcs: pcsNum,
        jml_hasil_produksi: jmlHasilNum,
        ket_pcs: ketPcs,
        status_inspeksi: statusInspeksiBool,
        keterangan: panel.keteranganCacat || null,
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
    });

    // 2. Coba simpan ke database Supabase jika terkonfigurasi`;

content = content.replace(searchStr, replaceStr);

// Replace the insert block
const searchInsert = /\/\/ A\. Insert ke tabel `productions`[\s\S]*?if \(prodError\) throw new Error\(`Gagal menyimpan produksi: \$\{prodError\.message\}`\);/;
const replaceInsert = `// A. Insert ke tabel \`productions\` (Bulk Insert)
        const { error: prodError } = await supabase
          .from("productions")
          .insert(insertData);

        if (prodError) throw new Error(\`Gagal menyimpan produksi: \${prodError.message}\`);`;

content = content.replace(searchInsert, replaceInsert);

// Return success with array length info
content = content.replace(/return \{ success: true, productionId \};/, `return { success: true, productionId };`);

fs.writeFileSync('actions/employee-actions.ts', content);
