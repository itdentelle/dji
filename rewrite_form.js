const fs = require('fs');

let content = fs.readFileSync('components/forms/EmployeeForm.tsx', 'utf8');

// 1. Update defaultValues (panelNo moves out, pcsData replaces panels)
content = content.replace(
  /panels:\s*\[\s*\{\s*panelNo:\s*"1",\s*jmlHasilProduksi:\s*"",\s*indikatorStop:\s*false,\s*kategoriMasalah:\s*"",\s*detailMasalah:\s*"",\s*keteranganCacat:\s*"",\s*\}\s*\]/,
  `panelNo: "1",
      pcsData: [
        {
          pcsIndex: "1",
          jmlHasilProduksi: "",
          indikatorStop: false,
          kategoriMasalah: "",
          detailMasalah: "",
          keteranganCacat: "",
        }
      ]`
);

// 2. Change useFieldArray name
content = content.replace(
  /name:\s*"panels",/,
  `name: "pcsData",`
);

// 3. Update watchPotonganKe effect for panelNo
content = content.replace(
  /setValue\("panels\.0\.panelNo",\s*res\.nextPanelNo\.toString\(\)\);/,
  `setValue("panelNo", res.nextPanelNo.toString());`
);

// 4. Also watch Pcs to generate fields automatically
const pcsWatchEffect = `
  const watchPcs = watch("pcs");

  // Generate PCS fields automatically based on 'pcs' header
  useEffect(() => {
    if (!watchPcs || isNaN(parseInt(watchPcs))) return;
    const numPcs = parseInt(watchPcs);
    if (numPcs > 0 && numPcs <= 10) {
      const currentPcsData = watch("pcsData") || [];
      const newPcsData = [];
      for (let i = 1; i <= numPcs; i++) {
        const existing = currentPcsData[i - 1];
        if (existing) {
          newPcsData.push({ ...existing, pcsIndex: i.toString() });
        } else {
          newPcsData.push({
            pcsIndex: i.toString(),
            jmlHasilProduksi: "",
            indikatorStop: false,
            kategoriMasalah: "",
            detailMasalah: "",
            keteranganCacat: "",
          });
        }
      }
      setValue("pcsData", newPcsData);
    }
  }, [watchPcs, setValue]);
`;

content = content.replace(
  /const watchPotonganKe = watch\("potonganKe"\);/,
  `const watchPotonganKe = watch("potonganKe");\n${pcsWatchEffect}`
);


// 5. Update onSubmit
const onSubmitSearch = /const currentPanels = data\.panels \|\| \[\];[\s\S]*?localStorage\.setItem\('dji_form_header', JSON\.stringify\(headerDataToSave\)\);/;
const onSubmitReplace = `// Save Header Data to LocalStorage automatically on submit
    const currentPanelNo = data.panelNo;
    let nextPanelNo = "1";
    if (currentPanelNo) {
      const match = currentPanelNo.match(/\\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        nextPanelNo = currentPanelNo.replace(/\\d+$/, (num + 1).toString());
      } else {
        nextPanelNo = currentPanelNo + " 1";
      }
    }

    const headerDataToSave = {
      operatorId: data.operatorId,
      groupId: data.groupId,
      designId: data.designId,
      nomorMc: data.nomorMc,
      tanggalProduksi: data.tanggalProduksi,
      tanggalPotong: data.tanggalPotong,
      pick: data.pick,
      noOrderBarang: data.noOrderBarang,
      rollNo: data.rollNo,
      jenisBenangDasar: data.jenisBenangDasar,
      liner: data.liner,
      heavy: data.heavy,
      shadow: data.shadow,
      pinggiran: data.pinggiran,
      course: data.course,
      rpm: data.rpm,
      pic: data.pic,
      potonganKe: data.potonganKe,
      pcs: data.pcs,
      nextPanelNo, // we store the next available panel no
    };
    localStorage.setItem('dji_form_header', JSON.stringify(headerDataToSave));`;

content = content.replace(onSubmitSearch, onSubmitReplace);

// 6. Update handleClearHeader
content = content.replace(
  /panels:\s*\[\s*\{\s*panelNo:\s*"1",\s*jmlHasilProduksi:\s*"",\s*indikatorStop:\s*false,\s*kategoriMasalah:\s*"",\s*detailMasalah:\s*"",\s*keteranganCacat:\s*"",\s*\}\s*\]/,
  `panelNo: "1",
        pcsData: [{
          pcsIndex: "1",
          jmlHasilProduksi: "",
          indikatorStop: false,
          kategoriMasalah: "",
          detailMasalah: "",
          keteranganCacat: "",
        }]`
);

// 7. Update handleCloseSuccess
content = content.replace(
  /reset\(\{\s*\.\.\.watch\(\),\s*panels:\s*\[\{\s*panelNo:\s*nextPanelNo,\s*jmlHasilProduksi:\s*"",\s*indikatorStop:\s*false,\s*kategoriMasalah:\s*"",\s*detailMasalah:\s*"",\s*keteranganCacat:\s*"",\s*\}\]\s*\}\);/,
  `reset({
      ...watch(),
      panelNo: nextPanelNo,
      pcsData: [{
        pcsIndex: "1",
        jmlHasilProduksi: "",
        indikatorStop: false,
        kategoriMasalah: "",
        detailMasalah: "",
        keteranganCacat: "",
      }]
    });`
);

// 8. Remove handleAddPanel
content = content.replace(
  /const handleAddPanel = \(\) => \{[\s\S]*?\}\s*\]\);\s*\};/,
  ``
);

// 9. Update the JSX for panels mapping
const jsxSearch = /{\/\* ARRAY OF PANELS \*\/}*[\s\S]*?<\/\s*button\>\s*<\/\s*div\>/;
const jsxReplace = `{/* Data Panel Umum */}
          <div className="mt-8 pt-6 border-t-2 border-slate-200/60 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-[10px] font-bold text-sky-500 uppercase tracking-widest border border-slate-200 rounded-full">
              Wajib Diisi Per Panel
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">No. Panel (PNL NO)</label>
                <input type="text" {...register("panelNo")} className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm font-semibold focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all shadow-sm" placeholder="1, 2, 3..." />
                {errors.panelNo && <span className="text-red-500 text-[10px] font-bold">{errors.panelNo.message}</span>}
              </div>
            </div>
          </div>

          {/* ARRAY OF PCS */}
          <div className="mt-8">
            <div className="text-center mb-6">
              <h4 className="text-sm font-bold text-slate-700">Detail per PCS (Otomatis dari nilai Header)</h4>
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => {
                const watchIndikator = watch(\`pcsData.\${index}.indikatorStop\` as any);
                return (
                  <div key={field.id} className="border-t-2 border-slate-200/60 relative pt-6 pb-2">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 text-[10px] font-bold text-sky-500 uppercase tracking-widest border border-slate-200 rounded-full flex gap-3 items-center shadow-sm">
                      <span>PCS Ke-{index + 1}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Jumlah Hasil Produksi</label>
                        <input type="text" {...register(\`pcsData.\${index}.jmlHasilProduksi\` as const)} className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm focus:border-sky-400 outline-none transition-all shadow-sm" placeholder="Masukkan hasil pcs" />
                        {errors.pcsData?.[index]?.jmlHasilProduksi && <span className="text-red-500 text-[10px] font-bold">{errors.pcsData[index]?.jmlHasilProduksi?.message}</span>}
                      </div>
                    </div>

                    <div className={\`mt-4 border rounded-xl overflow-hidden transition-all duration-300 \${watchIndikator ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'}\`}>
                      <label className="flex items-center justify-between p-4 cursor-pointer select-none">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register(\`pcsData.\${index}.indikatorStop\` as const)} className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer" />
                          <div>
                            <h5 className={\`text-sm font-bold \${watchIndikator ? 'text-red-650' : 'text-slate-600'}\`}>Terdapat Cacat / Kendala pada PCS ini?</h5>
                          </div>
                        </div>
                      </label>

                      {watchIndikator && (
                        <div className="p-4 border-t border-red-100/50 space-y-4 animate-fadeIn">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-red-600 uppercase">Kategori Masalah (Kode A-H)</label>
                            <select {...register(\`pcsData.\${index}.kategoriMasalah\` as const)} className="h-11 px-3 rounded-xl bg-white border border-red-200 text-xs focus:border-red-400 outline-none">
                              <option value="">-- Pilih Kategori --</option>
                              {NEW_PROBLEM_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>`;

content = content.replace(jsxSearch, jsxReplace);

// 10. Fix success message
content = content.replace(
  /\$\{successData\.panels\?\.length \|\| 0\} Panel/,
  `Panel #\${successData.panelNo}`
);

fs.writeFileSync('components/forms/EmployeeForm.tsx', content);
