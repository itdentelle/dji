const fs = require('fs');

let content = fs.readFileSync('components/forms/EmployeeForm.tsx', 'utf8');

// 1. Update useForm destructured variables
content = content.replace(
  /register,\s+handleSubmit,\s+setValue,\s+watch,\s+reset,\s+formState:\s+\{\s+errors\s+\},/g,
  `register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },`
);

// 2. Update defaultValues
content = content.replace(
  /defaultValues:\s+\{[\s\S]*?fotoAfter:\s+null,\s+\},/,
  `defaultValues: {
      operatorId: "3", 
      groupId: "2",
      designId: "1",
      nomorMc: "",
      tanggalProduksi: new Date().toISOString().split('T')[0],
      tanggalPotong: "",
      pick: "",
      noOrderBarang: "",
      rollNo: "",
      jenisBenangDasar: "",
      liner: "",
      heavy: "",
      shadow: "",
      pinggiran: "",
      rpm: "",
      potonganKe: "",
      course: "",
      pcs: "",
      pic: "",
      fotoBefore: null,
      fotoAfter: null,
      panels: [
        {
          panelNo: "1",
          jmlHasilProduksi: "",
          indikatorStop: false,
          kategoriMasalah: "",
          detailMasalah: "",
          keteranganCacat: "",
        }
      ]
    },`
);

// 3. Insert useFieldArray after useForm
content = content.replace(
  /\}\);\s+\/\/ Load Header Data dari LocalStorage/,
  `});

  const { fields, append, remove } = useFieldArray({
    control,
    name: "panels",
  });

  // Load Header Data dari LocalStorage`
);

// 4. Update the watch variables and useEffect for potonganKe
content = content.replace(
  /const watchIndikatorStop[\s\S]*?\}, \[watchPotonganKe, setValue\]\);/,
  `const watchPotonganKe = watch("potonganKe");

  // Fetch the next panelNo when potonganKe changes
  useEffect(() => {
    if (!watchPotonganKe || isNaN(parseInt(watchPotonganKe))) {
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await getLastPanelNoByPotongan(parseInt(watchPotonganKe));
        if (res.success && res.nextPanelNo) {
          setValue("panels.0.panelNo", res.nextPanelNo.toString());
        }
      } catch (e) {
      }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [watchPotonganKe, setValue]);`
);

// 5. Update onSubmit
content = content.replace(
  /const onSubmit = async \(data: ProductionFormInput\) => \{[\s\S]*?localStorage\.setItem\('dji_form_header', JSON\.stringify\(headerDataToSave\)\);/,
  `const onSubmit = async (data: ProductionFormInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // Save Header Data to LocalStorage automatically on submit
    const currentPanels = data.panels || [];
    const lastPanel = currentPanels[currentPanels.length - 1];
    let nextPanelNo = "1";
    if (lastPanel && lastPanel.panelNo) {
      const match = lastPanel.panelNo.match(/\\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        nextPanelNo = lastPanel.panelNo.replace(/\\d+$/, (num + 1).toString());
      } else {
        nextPanelNo = lastPanel.panelNo + " 1";
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
      nextPanelNo, // we store the next available panel no
    };
    localStorage.setItem('dji_form_header', JSON.stringify(headerDataToSave));`
);

// 6. Update handleClearHeader
content = content.replace(
  /potonganKe:\s+"",\s+panelNo:\s+"1",\s+\}\);/,
  `potonganKe: "",
        panels: [{
          panelNo: "1",
          jmlHasilProduksi: "",
          indikatorStop: false,
          kategoriMasalah: "",
          detailMasalah: "",
          keteranganCacat: "",
        }]
      });`
);

// 7. Update handleCloseSuccess
content = content.replace(
  /const handleCloseSuccess = \(\) => \{[\s\S]*?setPreviews\(\{ before: null, after: null \}\);\s+\};/,
  `const handleCloseSuccess = () => {
    setSuccessData(null);
    const savedHeader = localStorage.getItem('dji_form_header');
    let nextPanelNo = "1";
    if (savedHeader) {
      try {
        const parsed = JSON.parse(savedHeader);
        if (parsed.nextPanelNo) nextPanelNo = parsed.nextPanelNo;
      } catch(e) {}
    }
    reset({
      ...watch(),
      panels: [{
        panelNo: nextPanelNo,
        jmlHasilProduksi: "",
        indikatorStop: false,
        kategoriMasalah: "",
        detailMasalah: "",
        keteranganCacat: "",
      }]
    });
    setPreviews({ before: null, after: null });
  };
  
  const handleAddPanel = () => {
    const currentPanels = watch("panels") || [];
    const lastPanel = currentPanels[currentPanels.length - 1];
    let nextNo = "1";
    if (lastPanel && lastPanel.panelNo) {
      const match = lastPanel.panelNo.match(/\\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        nextNo = lastPanel.panelNo.replace(/\\d+$/, (num + 1).toString());
      } else {
        nextNo = lastPanel.panelNo + " 1";
      }
    }
    append({
      panelNo: nextNo,
      jmlHasilProduksi: "",
      indikatorStop: false,
      kategoriMasalah: "",
      detailMasalah: "",
      keteranganCacat: "",
    });
  };`
);

// 8. Replace Panel render
const searchJSX = /{\/\* Sisa Isian Aktual Panel \(No Panel & Kendala\) \*\/}[\s\S]*?{\/\* Dokumentasi Foto disembunyikan sementara sesuai request \*\/}\s+<\/div>/;

const replaceJSX = `{/* ARRAY OF PANELS */}
          <div className="mt-8">
            <div className="text-center mb-6">
              <h4 className="text-sm font-bold text-slate-700">Data Panel (Bisa lebih dari 1)</h4>
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => {
                const watchIndikator = watch(\`panels.\${index}.indikatorStop\` as any);
                return (
                  <div key={field.id} className="border-t-2 border-slate-200/60 relative pt-6 pb-2">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 text-[10px] font-bold text-sky-500 uppercase tracking-widest border border-slate-200 rounded-full flex gap-3 items-center shadow-sm">
                      <span>Baris Ke-{index + 1}</span>
                      {index > 0 && (
                        <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600 transition-colors p-1" title="Hapus baris ini">
                          <X className="w-3 h-3" strokeWidth={3} />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">No. Panel (PNL NO)</label>
                        <input type="text" {...register(\`panels.\${index}.panelNo\` as const)} className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm font-semibold focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all shadow-sm" placeholder="1, 2, 3..." />
                        {errors.panels?.[index]?.panelNo && <span className="text-red-500 text-[10px] font-bold">{errors.panels[index]?.panelNo?.message}</span>}
                      </div>
                    </div>

                    <div className={\`mt-4 border rounded-xl overflow-hidden transition-all duration-300 \${watchIndikator ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'}\`}>
                      <label className="flex items-center justify-between p-4 cursor-pointer select-none">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register(\`panels.\${index}.indikatorStop\` as const)} className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer" />
                          <div>
                            <h5 className={\`text-sm font-bold \${watchIndikator ? 'text-red-650' : 'text-slate-600'}\`}>Terdapat Kendala / Mesin Stop / Cacat?</h5>
                          </div>
                        </div>
                      </label>

                      {watchIndikator && (
                        <div className="p-4 border-t border-red-100/50 space-y-4 animate-fadeIn">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-red-600 uppercase">Kategori Masalah (Kode A-H)</label>
                            <select {...register(\`panels.\${index}.kategoriMasalah\` as const)} className="h-11 px-3 rounded-xl bg-white border border-red-200 text-xs focus:border-red-400 outline-none">
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

            <button type="button" onClick={handleAddPanel} className="w-full mt-6 h-12 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 hover:border-sky-300 flex items-center justify-center gap-2 font-bold transition-all text-sm">
              <Plus className="w-5 h-5" /> Tambah Baris Panel Baru
            </button>
          </div>`;

content = content.replace(searchJSX, replaceJSX);

// 9. Update the modal text
content = content.replace(
  /Data laporan untuk Panel #\{successData\.panelNo\}/,
  `Data laporan untuk \${successData.panels?.length || 0} Panel`
);

fs.writeFileSync('components/forms/EmployeeForm.tsx', content);
