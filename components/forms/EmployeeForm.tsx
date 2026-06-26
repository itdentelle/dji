"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productionFormSchema, ProductionFormInput } from "@/lib/schemas";
import { useAuth } from "@/lib/auth-context";
import { createProductionReport, uploadProductionPhoto, getLastPanelNoByPotongan, updateProductionReport } from "@/actions/employee-actions";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, RefreshCw, UploadCloud, X, Camera, Database, FileText, Settings2, Trash2, ChevronUp, ChevronDown, CheckCircle2, Save, Plus, Box, ClipboardList, Play, Square, Timer } from "lucide-react";
import { useRouter } from "next/navigation";

// DATA FALLBACK DARI EXCEL
const FALLBACK_OPERATORS = [
  // Shift A
  { id: 1, name: "Rohmat", shift: "A" }, { id: 2, name: "M.Alwi", shift: "A" }, { id: 3, name: "Anwar", shift: "A" },
  { id: 4, name: "Jaya", shift: "A" }, { id: 5, name: "Riki S", shift: "A" }, { id: 6, name: "Sandi M", shift: "A" },
  { id: 7, name: "Padlan", shift: "A" }, { id: 8, name: "Rissa A", shift: "A" }, { id: 9, name: "Devi K", shift: "A" },
  { id: 10, name: "Novi S", shift: "A" }, { id: 11, name: "Udin", shift: "A" },
  // Shift B
  { id: 12, name: "Irfan", shift: "B" }, { id: 13, name: "Anton", shift: "B" }, { id: 14, name: "Ahmad S", shift: "B" },
  { id: 15, name: "Saepudin", shift: "B" }, { id: 16, name: "Parid", shift: "B" }, { id: 17, name: "Noval", shift: "B" },
  { id: 18, name: "Sigit", shift: "B" }, { id: 19, name: "Rani Y", shift: "B" }, { id: 20, name: "Yanti P", shift: "B" },
  { id: 21, name: "Irma P", shift: "B" }, { id: 22, name: "Aris W", shift: "B" },
  // Shift C
  { id: 23, name: "Tubagus", shift: "C" }, { id: 24, name: "Andri Y", shift: "C" }, { id: 25, name: "Royana", shift: "C" },
  { id: 26, name: "Komara", shift: "C" }, { id: 27, name: "Sopian", shift: "C" }, { id: 28, name: "Iki S", shift: "C" },
  { id: 29, name: "Hardi", shift: "C" }, { id: 30, name: "Rini D", shift: "C" }, { id: 31, name: "Neneng", shift: "C" },
  { id: 32, name: "Rina R", shift: "C" }, { id: 33, name: "Farhan", shift: "C" }
];

const FALLBACK_DESIGNS = [
  { id: 1, name: "TCD 5826 XA" }, { id: 2, name: "DL 5675 CO" }, { id: 3, name: "DL 5167 CO" },
  { id: 4, name: "DL 5169 CO" }, { id: 5, name: "DL 6460 CR" }, { id: 6, name: "DL 5162 CO" }, { id: 7, name: "DL 5168 CO" }
];

const FALLBACK_GROUPS = [
  { id: 1, name: "A" }, { id: 2, name: "B" }, { id: 3, name: "C" }
];

// NEW PROBLEM KATEGORI (A-H)
const NEW_PROBLEM_CATEGORIES = [
  { id: "A", name: "Kode A: Masalah dan Perbaikan Benang" },
  { id: "B", name: "Kode B: Perbaikan Jarum dan Element Rajutan" },
  { id: "C", name: "Kode C: Pengaturan dan Design stup" },
  { id: "D", name: "Kode D: Bahan Baku dan penggantian Benang" },
  { id: "E", name: "Kode E: Masalah Kelistrikan" },
  { id: "F", name: "Kode F: Perbaikan Mekanik (Pneumatic dan Mechanical)" },
  { id: "G", name: "Kode G: Perawatan mesin (Maintenance/Overhaul)" },
  { id: "H", name: "Kode H: Faktor Eksternal dan Non-Teknis" },
];

const NEW_PROBLEMS: Record<string, string[]> = {
  "A": [
    "Perbaikan L1,L2,L3 Benang timbul putus", "Perbaikan Benang lolos", "Perbaikan Bolong corak",
    "Perbaikan Benang narik/Kendor", "Perbaikan Benang Nyilang", "Perbaikan/Beset benang Dasar", "Perbaikan Benang Kejepit/Jebol/kusut"
  ],
  "B": [
    "Perbaikan jarum pattern patah/bengkok", "Perbaikan/Ganti Jacquard", "Perbaikan ganti jarum Compoun Nedle, pattern",
    "Perbaikan ngampul", "Ganti dari scaloop ke non scaloop atau sebaliknya", "Perbaikan Ngegaris/Stopline", "Perbaikan Keluar Jarum"
  ],
  "C": [
    "Loading design/Ganti Design", "Perbaikan corak/revisi", "Salah ganti design", "Error design",
    "Proofing/PCB", "Ganti Pattern Disk", "Ganti pick"
  ],
  "D": [
    "Ganti benang dasar L1/L2", "Salah ganti benang dasar", "Ganti benang Pattern Linner", "Ganti benang Pattern Heavy",
    "Ganti benang Pattern Shadow", "Ganti benang pattern keseluruhan (L,H,S)", "salah ganti benang pattern", "Ngelancarin",
    "Over Cone/Rewind", "Tunggu benang dasar dari warping", "Tunggu benang (benang belum datang)"
  ],
  "E": [
    "Mati Listrik", "Perbaikan Error Servo Drive", "Perbaikan/ganti motor servo", "Sensor Benang/Laser Stop",
    "Perbaikan Eletrik lainnya", "Konsleting"
  ],
  "F": [
    "Perbaikan cilynder Angin", "Perbaikan/ganti String bar", "Perbaikan /ganti PBO", "Perbaikan pressan As beam kendor",
    "Perbaikan tensi tensioner", "Perbaikan gear/Take Up Roll"
  ],
  "G": [
    "Ganti Oli", "Ganti Bellow", "Ganti Vanbelt", "Ganti Black grip roll", "Pelumasan/greace pada mesin",
    "Perawatan Panel Listrik", "Ganti rantai/pertensi", "Servis Overhaul"
  ],
  "H": [
    "Hari Libur", "Tidak ada order", "Tunggu info", "Demo", "Bencana/gempa/banjir", "Istirahat selama buka puasa", "Tunggu Sparepart"
  ]
};

// Client-side image compression helper
const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.7): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

type EmployeeFormProps = {
  initialData?: any;
  isEdit?: boolean;
};

export default function EmployeeForm({ initialData, isEdit }: EmployeeFormProps = {}) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<ProductionFormInput & { id?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLastPanel, setIsLastPanel] = useState(false);
  
  // Photo States
  const [fotoBefore, setFotoBefore] = useState<File | null>(null);
  const [fotoAfter, setFotoAfter] = useState<File | null>(null);

  const router = useRouter();

  // States untuk dynamic dropdown dari Supabase
  const [operators, setOperators] = useState(FALLBACK_OPERATORS);
  const [designs, setDesigns] = useState(FALLBACK_DESIGNS);
  const [groups, setGroups] = useState(FALLBACK_GROUPS);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Accordion UI State
  const [isHeaderOpen, setIsHeaderOpen] = useState(true);

  // States untuk upload foto
  const [isUploading, setIsUploading] = useState<{ before: boolean; after: boolean }>({ before: false, after: false });
  const [previews, setPreviews] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });

  // Timer State for Downtime
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartRef, setTimerStartRef] = useState<number | null>(null);
  const [liveTimerSeconds, setLiveTimerSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timerStartRef) {
      interval = setInterval(() => {
        const elapsedMs = Date.now() - timerStartRef;
        setLiveTimerSeconds(Math.floor(elapsedMs / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartRef]);

  const handleStartTimer = () => {
    setIsTimerRunning(true);
    setTimerStartRef(Date.now());
    setLiveTimerSeconds(0);
  };

  const handleStopTimer = () => {
    if (!isTimerRunning) return;
    setIsTimerRunning(false);
    
    // Calculate elapsed minutes (round up to nearest minute)
    const elapsedMs = Date.now() - (timerStartRef || Date.now());
    const elapsedMins = Math.ceil(elapsedMs / 60000);
    
    const currentTotalStr = watch("totalDowntime");
    const currentTotal = parseInt(currentTotalStr || "0") || 0;
    
    const newTotal = currentTotal + elapsedMins;
    setValue("totalDowntime", String(newTotal), { shouldValidate: true, shouldDirty: true });
    
    setTimerStartRef(null);
    setLiveTimerSeconds(0);
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Hubungkan ke Supabase secara dinamis
  useEffect(() => {
    async function loadDbData() {
      try {
        const supabase = createClient();
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
          return;
        }

        const { data: opData } = await supabase.from("operators").select("id, nama_operator");
        if (opData && opData.length > 0) {
          // KITA GUNAKAN FALLBACK DULU KARENA MINTA SESUAI GAMBAR BARU (SHIFT A,B,C)
          // setOperators(opData.map((o: any) => ({ id: o.id, name: o.nama_operator })));
          setIsDbConnected(true);
        }

        const { data: dsData } = await supabase.from("designs").select("id, nama_design");
        if (dsData && dsData.length > 0) {
          setDesigns(dsData.map((d: any) => ({ id: d.id, name: d.nama_design })));
        }

        const { data: gpData } = await supabase.from("groups").select("id, nama_grup");
        if (gpData && gpData.length > 0) {
          setGroups(gpData.map((g: any) => ({ id: g.id, name: g.nama_grup })));
        }
      } catch (err) {
        console.warn("Koneksi Supabase real gagal atau belum disemai, menggunakan data fallback dari Excel.", err);
      }
    };
    loadDbData();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductionFormInput>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      operatorId: ["3"], 
      groupId: "2",
      designId: "1",
      nomorMc: "",
      tanggalProduksi: new Date().toISOString().split('T')[0],
      tanggalPotong: "",
      pick: "",
      noOrderBarang: "",
      jenisBenangDasar: "",
      liner: "",
      heavy: "",
      shadow: "",
      pinggiran: "",
      rpm: "",
      potonganKe: "",
      course: "",
      pic: "",
      fotoBefore: null,
      fotoAfter: null,
      panelNo: "1",
      totalDowntime: "",
      pcsData: [
        {
          pcsIndex: "1",
          jmlHasilProduksi: "1",
          indikatorStop: false,
          kategoriMasalah: [],
          detailMasalah: "",
          keteranganCacat: "",
          rollNo: "",
        }
      ]
    },
  });


  useEffect(() => {
    if (initialData && isEdit) {
      reset({
        operatorId: initialData.operator_id ? [String(initialData.operator_id)] : [],
        groupId: String(initialData.group_id || ""),
        designId: String(initialData.design_id || ""),
        nomorMc: initialData.nomor_mc || "",
        tanggalProduksi: initialData.tgl || new Date().toISOString().split('T')[0],
        tanggalPotong: initialData.tanggal_potong || "",
        pick: initialData.pick || "",
        noOrderBarang: initialData.no_order_barang || "",
        jenisBenangDasar: initialData.jenis_benang_dasar || "",
        liner: initialData.liner || "",
        heavy: initialData.heavy || "",
        shadow: initialData.shadow || "",
        pinggiran: initialData.pinggiran || "",
        rpm: String(initialData.rpm || ""),
        potonganKe: String(initialData.potongan_ke || ""),
        course: initialData.course || "",
        pic: initialData.pic || "",
        panelNo: String(initialData.panel_no || "1"),
        totalDowntime: String(initialData.total_downtime_menit || ""),
        pcsData: initialData.details && initialData.details.length > 0 ? initialData.details.map((d: any) => ({
          pcsIndex: String(d.pcs_index || "1"),
          jmlHasilProduksi: String(d.jml_hasil_produksi || "1"),
          indikatorStop: d.kategori_masalah ? true : false,
          kategoriMasalah: d.kategori_masalah ? d.kategori_masalah.split(', ') : [],
          detailMasalah: d.detail_masalah || "",
          keteranganCacat: d.keterangan_cacat || "",
          rollNo: d.roll_no || "",
        })) : [
          {
            pcsIndex: "1",
            jmlHasilProduksi: "1",
            indikatorStop: false,
            kategoriMasalah: [],
            detailMasalah: "",
            keteranganCacat: "",
            rollNo: "",
          }
        ]
      });
      if (initialData.tanggal_potong) {
        setIsLastPanel(true);
      }
    }
  }, [initialData, isEdit, reset]);

  const watchGroupId = watch("groupId");
  const selectedGroup = groups.find(g => g.id.toString() === watchGroupId);
  const activeShiftName = selectedGroup ? selectedGroup.name : "A";

  const activeOperators = operators.filter((op: any) => op.shift === activeShiftName || !op.shift);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "pcsData",
  });

  // Load Draft or Header Data dari LocalStorage
  useEffect(() => {
    if (isEdit) return;

    const savedDraft = localStorage.getItem('dji_form_draft_panel');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        reset(parsed);
        setIsHeaderOpen(false);
        return;
      } catch (e) {
        console.error("Gagal load draft dari storage", e);
      }
    }

    const savedHeader = localStorage.getItem('dji_form_header');
    if (savedHeader) {
      try {
        const parsed = JSON.parse(savedHeader);
        Object.keys(parsed).forEach(key => {
          if (key === 'lastRollNo') {
            const rollVal = parsed[key];
            if (rollVal) {
              const currentPcs = [{
                pcsIndex: "1",
                jmlHasilProduksi: "1",
                indikatorStop: false,
                kategoriMasalah: [],
                detailMasalah: "",
                keteranganCacat: "",
                rollNo: rollVal,
              }];
              setValue("pcsData", currentPcs);
            }
          } else {
            setValue(key as keyof ProductionFormInput, parsed[key]);
          }
        });
        // Jika ada header yang di-load, tutup accordion header agar fokus ke input panel
        setIsHeaderOpen(false);
      } catch (e) {
        console.error("Gagal load header dari storage", e);
      }
    }
  }, [setValue, isEdit, reset]);

  // Subscribe to all form changes to save draft
  useEffect(() => {
    if (isEdit) return;
    const subscription = watch((value) => {
      localStorage.setItem('dji_form_draft_panel', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch, isEdit]);

  const watchPotonganKe = watch("potonganKe");
  // Fetch the next panelNo when potonganKe changes
  useEffect(() => {
    if (isEdit || !watchPotonganKe || isNaN(parseInt(watchPotonganKe))) {
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await getLastPanelNoByPotongan(parseInt(watchPotonganKe));
        if (res.success && res.nextPanelNo) {
          setValue("panelNo", res.nextPanelNo.toString());
        }
      } catch (e) {
      }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [watchPotonganKe, setValue, isEdit]);

  const onSubmit = async (data: ProductionFormInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // Filter operatorId to only include those in activeOperators
    const validOperatorIds = data.operatorId.filter(id => activeOperators.some((op: any) => op.id.toString() === id));
    if (validOperatorIds.length === 0) {
      setErrorMsg("Silakan pilih minimal 1 operator yang sesuai dengan shift.");
      setIsSubmitting(false);
      return;
    }
    
    data.operatorId = validOperatorIds;

    // Gabungkan nama-nama operator yang dipilih dan simpan ke PIC
    const operatorNames = data.operatorId.map(id => getOperatorName(id)).filter(Boolean).join(", ");
    data.pic = operatorNames;
    data.grupName = getGroupName(data.groupId);
    data.designName = getDesignName(data.designId);

    // Save Header Data to LocalStorage automatically on submit
    // Save Header Data to LocalStorage automatically on submit
    const currentPanelNo = data.panelNo;
    let nextPanelNo = "1";
    if (currentPanelNo) {
      const match = currentPanelNo.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        nextPanelNo = currentPanelNo.replace(/\d+$/, (num + 1).toString());
      } else {
        nextPanelNo = currentPanelNo + " 1";
      }
    }

    const lastRollNo = data.pcsData && data.pcsData.length > 0 ? data.pcsData[0].rollNo : "";

    const headerDataToSave = {
      operatorId: data.operatorId,
      groupId: data.groupId,
      designId: data.designId,
      nomorMc: data.nomorMc,
      tanggalProduksi: data.tanggalProduksi,
      tanggalPotong: data.tanggalPotong,
      pick: data.pick,
      noOrderBarang: data.noOrderBarang,
      noCustomer: data.noCustomer,
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
      lastRollNo: lastRollNo,
    };
    localStorage.setItem('dji_form_header', JSON.stringify(headerDataToSave));

    try {
      if (!navigator.onLine) {
        const { addPendingPayload } = await import("@/lib/offline-store");
        await addPendingPayload("employee", data);
        localStorage.removeItem('dji_form_draft_panel');
        setSuccessData({ ...data, isOfflineSaved: true } as any);
        return;
      }

      let result;
      if (isEdit && initialData?.id) {
        result = await updateProductionReport(initialData.id, data);
      } else {
        result = await createProductionReport(data);
      }
      
      if (result.success) {
        localStorage.removeItem('dji_form_draft_panel');
        setSuccessData({ ...data, id: isEdit ? initialData.id : (result as any).productionId });
      } else {
        setErrorMsg(result.error || "Gagal menyimpan laporan produksi rajut.");
      }
    } catch (err: any) {
      if (err.message?.includes("fetch") || err.message?.includes("Network") || !navigator.onLine) {
         const { addPendingPayload } = await import("@/lib/offline-store");
         await addPendingPayload("employee", data);
         localStorage.removeItem('dji_form_draft_panel');
         setSuccessData({ ...data, isOfflineSaved: true } as any);
      } else {
         console.error("Uncaught exception in onSubmit:", err);
         setErrorMsg(`Terjadi kesalahan sistem: ${err.message || err}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearHeader = () => {
    if (window.confirm("Yakin ingin mereset/mengosongkan data Header?")) {
      localStorage.removeItem('dji_form_header');
      localStorage.removeItem('dji_form_draft_panel');
      reset({
        ...watch(), // Keep current panel inputs
        nomorMc: "",
        tanggalPotong: "",
        pick: "",
        noOrderBarang: "",
        jenisBenangDasar: "",
        liner: "",
        heavy: "",
        shadow: "",
        pinggiran: "",
        course: "",
        rpm: "",
        potonganKe: "",
        panelNo: "1",
        totalDowntime: "",
        pcsData: [{
          pcsIndex: "1",
          jmlHasilProduksi: "",
          indikatorStop: false,
          kategoriMasalah: [],
          detailMasalah: "",
          keteranganCacat: "",
        }]
      });
      setIsLastPanel(false);
      setIsHeaderOpen(true);
    }
  };

  const handleCloseSuccess = () => {
    if (isEdit) {
      sessionStorage.removeItem("dji_history_data");
      sessionStorage.removeItem("dji_history_searched");
      router.push("/history");
      return;
    }
    setSuccessData(null);
    const savedHeader = localStorage.getItem('dji_form_header');
    let nextPanelNo = "1";
    if (savedHeader) {
      try {
        const parsed = JSON.parse(savedHeader);
        if (parsed.nextPanelNo) nextPanelNo = parsed.nextPanelNo;
      } catch(e) {}
    }
    const currentPcsData = watch("pcsData") || [];
    const newPcsData = currentPcsData.map((pcs, index) => ({
      pcsIndex: (index + 1).toString(),
      jmlHasilProduksi: "1",
      rollNo: pcs.rollNo || "",
      indikatorStop: false,
      kategoriMasalah: [],
      detailMasalah: "",
      keteranganCacat: "",
    }));

    reset({
      ...watch(),
      panelNo: nextPanelNo,
      pcsData: newPcsData.length > 0 ? newPcsData : [{
        pcsIndex: "1",
        jmlHasilProduksi: "1",
        rollNo: "",
        indikatorStop: false,
        kategoriMasalah: [],
        detailMasalah: "",
        keteranganCacat: "",
      }],
      totalDowntime: "",
      tanggalPotong: "",
    });
    setIsLastPanel(false);
    setPreviews({ before: null, after: null });
  };
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(prev => ({ ...prev, [type]: true }));
      setErrorMsg(null);

      const compressedFile = await compressImage(file);
      const objectUrl = URL.createObjectURL(compressedFile);
      setPreviews(prev => ({ ...prev, [type]: objectUrl }));

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
        await new Promise(r => setTimeout(r, 1000));
        setValue(type === 'before' ? 'fotoBefore' : 'fotoAfter', `mock_url_${type}_${Date.now()}`);
        setIsUploading(prev => ({ ...prev, [type]: false }));
        return;
      }

      const base64Data = await fileToBase64(compressedFile);
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      const uploadResult = await uploadProductionPhoto(base64Data, fileName);
      if (!uploadResult.success || !uploadResult.publicUrl) {
        throw new Error(uploadResult.error || "Gagal mengunggah foto.");
      }

      setValue(type === 'before' ? 'fotoBefore' : 'fotoAfter', uploadResult.publicUrl);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Gagal mengunggah foto ${type}: ${errorMessage}`);
      setPreviews(prev => ({ ...prev, [type]: null }));
    } finally {
      setIsUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const removePhoto = (type: 'before' | 'after') => {
    setPreviews(prev => ({ ...prev, [type]: null }));
    setValue(type === 'before' ? 'fotoBefore' : 'fotoAfter', null);
  };

  const getOperatorName = (id: string) => operators.find(o => o.id.toString() === id)?.name || id;
  const getGroupName = (id: string) => groups.find(g => g.id.toString() === id)?.name || `Grup ${id}`;
  const getDesignName = (id: string) => designs.find(d => d.id.toString() === id)?.name || id;

  return (
    <div className="w-full bg-gradient-to-br from-blue-50/40 via-white to-white border border-[#e9ecef] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,112,188,0.06)] text-slate-800 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none z-0"></div>
      
      <div className="relative z-10">
      {/* Segmented Control for Mode Switching */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-8 border border-slate-200/60 shadow-inner">
        <div className="flex-1 flex items-center justify-center py-3.5 rounded-xl bg-white shadow-sm border border-slate-200 text-[#0070bc] relative overflow-hidden group cursor-default">
          <div className="absolute inset-0 bg-blue-50/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Box className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-black uppercase tracking-wider leading-none">Panel</span>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">Input per Potongan</span>
            </div>
          </div>
        </div>
        <a href="/input-meter" className="flex-1 flex items-center justify-center py-3.5 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-white/60 transition-all cursor-pointer">
          <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold uppercase tracking-wider leading-none">Kontinu (Meteran)</span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5">Input per Roll</span>
            </div>
          </div>
        </a>
      </div>
      {/* Top Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Form Input Produksi (Operator)</h3>
          <p className="text-xs text-slate-400 font-normal mt-1">
            Data Header akan otomatis tersimpan untuk panel berikutnya.
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-medium transition-colors ${isDbConnected
          ? "bg-slate-50 text-slate-600 border-slate-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
          <Database className={`w-3 h-3 ${isDbConnected ? "text-slate-400" : "text-amber-500 animate-spin"}`} strokeWidth={2} />
          {isDbConnected ? "Supabase Terhubung" : "Mode Offline"}
        </div>
      </div>



      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-[20px] p-5 sm:p-6">
          
          <div className="flex justify-between items-center mb-5">
            <h4 className="text-sm font-bold text-slate-700">Identitas Operator & Desain</h4>
            <button type="button" onClick={handleClearHeader} className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
              <Trash2 className="w-3 h-3" />
              Reset Header
            </button>
          </div>

          {/* Bagian Teratas: Operator & Grup */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Nama Operator (Shift {activeShiftName})</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white custom-scrollbar">
                <div className="grid grid-cols-1 gap-1 px-1">
                  {activeOperators.length > 0 ? (
                    activeOperators.map((op: any) => (
                      <label key={op.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-colors">
                        <input type="checkbox" value={op.id.toString()} {...register("operatorId")} className="w-3.5 h-3.5 text-sky-500 border-slate-300 rounded focus:ring-sky-400" />
                        <span className="truncate">{op.name}</span>
                      </label>
                    ))
                  ) : (
                    <div className="col-span-full text-xs text-slate-400 italic py-2 text-center">Tidak ada operator di shift ini</div>
                  )}
                </div>
              </div>
              {errors.operatorId && <span className="text-red-500 text-[10px] font-bold">{errors.operatorId.message}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase">Grup Shift</label>
              <select {...register("groupId")} className="h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm focus:border-sky-400 outline-none">
                {groups.map(g => <option key={g.id} value={g.id.toString()}>Grup {g.name}</option>)}
              </select>
            </div>
          </div>

          {/* Form Utama sesuai layout referensi gambar */}
          <div className="grid grid-cols-2 gap-x-6 sm:gap-x-12 gap-y-4 border-t border-slate-100 pt-5">
            
            {/* Kolom Kiri */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Design</label>
                <input type="text" {...register("designId")} placeholder="Ketik nama design..." className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-sky-600 uppercase">Status Matching *</label>
                <select {...register("statusMatching")} className="h-10 px-3 rounded-lg bg-sky-50 border border-sky-200 text-sm focus:border-sky-400 outline-none font-semibold">
                  <option value="">-- Wajib Pilih --</option>
                  <option value="OK">OK</option>
                  <option value="Tidak OK">Tidak OK</option>
                </select>
                {errors.statusMatching && <span className="text-red-500 text-[10px] font-bold">{errors.statusMatching.message as string}</span>}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Nomo Mc</label>
                <select {...register("nomorMc")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none">
                  <option value="">-- Pilih --</option>
                  {["R1", "R2", "R3B", "R1C", "R2C", "R11", "R12", "R16", "T1C", "T2A", "Warping D6", "Winding"].map(mc => (
                    <option key={mc} value={mc}>{mc}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Tanggal Produksi</label>
                <input type="date" {...register("tanggalProduksi")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Pick</label>
                <input type="text" {...register("pick")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Course</label>
                <input type="text" {...register("course")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Rpm</label>
                <input type="text" {...register("rpm")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">No. Order Barang</label>
                <input type="text" {...register("noOrderBarang")} placeholder="EXT/..." className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
            </div>

            {/* Kolom Kanan */}
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-sky-600 uppercase">Potongan Ke</label>
                <input type="text" {...register("potonganKe")} className="h-10 px-3 rounded-lg bg-sky-50/50 border border-sky-200 text-sm font-semibold focus:border-sky-400 focus:bg-white outline-none" placeholder="Misal: 288 (Wajib diisi)" />
                {errors.potonganKe && <span className="text-red-500 text-[10px] font-bold">{errors.potonganKe.message}</span>}
              </div>


              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Jenis benang dasar</label>
                <input type="text" {...register("jenisBenangDasar")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Liner</label>
                <input type="text" {...register("liner")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Heavy</label>
                <input type="text" {...register("heavy")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Shadow</label>
                <input type="text" {...register("shadow")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Pinggiran</label>
                <input type="text" {...register("pinggiran")} className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">No. Customer</label>
                <input type="text" {...register("noCustomer")} placeholder="Customer..." className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:border-sky-400 outline-none" />
              </div>
            </div>

          </div>

          {/* Data Panel Umum */}
          <div className="mt-8 p-6 bg-sky-50 border-2 border-sky-300 rounded-2xl relative shadow-md">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-sky-500 px-5 py-1.5 text-[11px] font-black text-white uppercase tracking-widest border-2 border-white rounded-full shadow-md">
              Wajib Diisi Per Panel
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-sky-800 uppercase flex items-center gap-2">
                  No. Panel (PNL NO)
                </label>
                <input 
                  type="text" 
                  {...register("panelNo")} 
                  className="h-12 px-5 rounded-xl bg-white border-2 border-sky-200 text-base font-bold text-slate-800 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/20 outline-none transition-all shadow-inner" 
                  placeholder="Misal: 1, 2, 3..." 
                />
                {errors.panelNo && <span className="text-red-500 text-[10px] font-bold">{errors.panelNo.message}</span>}
              </div>
            </div>
          </div>

          {/* ARRAY OF PCS */}
          <div className="mt-8">
            <div className="text-center mb-6">
              <h4 className="text-sm font-bold text-slate-700">Detail per PCS</h4>
            </div>

            <div className="space-y-6">
              {fields.map((field, index) => {
                const watchIndikator = watch(`pcsData.${index}.indikatorStop` as any);
                return (
                  <div key={field.id} className="border-t-2 border-slate-200/60 relative pt-6 pb-2">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 py-0.5 text-[10px] font-bold text-sky-500 uppercase tracking-widest border border-slate-200 rounded-full flex gap-3 items-center shadow-sm">
                      <span>PCS Ke-{index + 1}</span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors"
                          title="Hapus PCS"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-1 gap-5 mt-4">
                      {/* Hidden Jml Hasil Produksi */}
                      <input type="hidden" {...register(`pcsData.${index}.jmlHasilProduksi` as const)} />
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Roll no</label>
                        <input type="text" {...register(`pcsData.${index}.rollNo` as const)} className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm focus:border-sky-400 outline-none transition-all shadow-sm" placeholder="Masukkan Roll no" />
                      </div>
                    </div>

                    <div className={`mt-4 border rounded-xl overflow-hidden transition-all duration-300 ${watchIndikator ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
                      <label className="flex items-center justify-between p-4 cursor-pointer select-none">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" {...register(`pcsData.${index}.indikatorStop` as const)} className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer" />
                          <div>
                            <h5 className={`text-sm font-bold ${watchIndikator ? 'text-red-650' : 'text-slate-600'}`}>Terdapat Cacat / Kendala pada PCS ini?</h5>
                          </div>
                        </div>
                      </label>

                      {watchIndikator && (
                        <div className="p-4 border-t border-red-100/50 space-y-4 animate-fadeIn">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-red-600 uppercase">Kategori Masalah (Pilih lebih dari 1)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                              {NEW_PROBLEM_CATEGORIES.map(c => (
                                <label key={c.id} className="flex items-center gap-2 p-2 bg-white border border-red-100 rounded-lg cursor-pointer hover:border-red-300 transition-colors">
                                  <input 
                                    type="checkbox" 
                                    value={c.id} 
                                    {...register(`pcsData.${index}.kategoriMasalah` as const)} 
                                    className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500" 
                                  />
                                  <span className="text-[10px] font-bold text-slate-700">{c.name}</span>
                                </label>
                              ))}
                            </div>
                            {errors.pcsData?.[index]?.kategoriMasalah && (
                              <span className="text-red-500 text-[10px] font-bold mt-1 block">
                                {errors.pcsData[index]?.kategoriMasalah?.message}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => append({
                  pcsIndex: String(fields.length + 1),
                  jmlHasilProduksi: "1",
                  indikatorStop: false,
                  kategoriMasalah: [],
                  detailMasalah: "",
                  keteranganCacat: "",
                })}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 text-slate-400" />
                Tambah PCS Baru
              </button>
            </div>
          </div>
        </div>

        {/* Global Downtime Input */}
        {watch("pcsData")?.some((pcs) => pcs.indikatorStop) && (
          <div className="p-5 bg-orange-50 border border-orange-200 rounded-2xl shadow-sm mb-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-orange-800 uppercase flex items-center gap-2">
                Total Estimasi Waktu Mesin Berhenti (Downtime)
              </label>
              <p className="text-[10px] text-orange-600">
                Isi total keseluruhan waktu dalam menit jika mesin sempat berhenti selama produksi panel ini.
              </p>
              <div className="relative flex items-center gap-3">
                <div className="relative flex-1">
                  <input 
                    type="number" 
                    {...register("totalDowntime")} 
                    className="w-full h-12 pl-4 pr-16 rounded-xl bg-white border border-orange-300 text-sm font-bold text-slate-800 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all shadow-sm" 
                    placeholder="Misal: 45" 
                    disabled={isTimerRunning}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-600 text-xs font-bold">Menit</span>
                </div>
                
                {/* Timer Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isTimerRunning ? (
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      className="flex items-center gap-2 px-4 h-12 bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold text-xs rounded-xl transition-all shadow-sm border border-orange-300"
                    >
                      <Play className="w-4 h-4" />
                      Mulai Timer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopTimer}
                      className="flex items-center gap-2 px-4 h-12 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-red-500/20"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      Selesai ({formatTimer(liveTimerSeconds)})
                    </button>
                  )}
                </div>
              </div>
              {errors.totalDowntime && (
                <span className="text-red-500 text-[10px] font-bold mt-1 block">
                  {errors.totalDowntime.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Potong Kain Toggle */}
        <div className={`p-5 border rounded-2xl transition-all duration-300 mb-6 ${isLastPanel ? 'bg-sky-50 border-sky-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={isLastPanel}
                onChange={(e) => {
                  setIsLastPanel(e.target.checked);
                  if (e.target.checked) {
                    setValue("tanggalPotong", new Date().toISOString().split('T')[0]);
                  } else {
                    setValue("tanggalPotong", "");
                  }
                }}
                className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer" 
              />
              <div>
                <h5 className={`text-sm font-bold ${isLastPanel ? 'text-sky-700' : 'text-slate-600'}`}>
                  Potong Kain (Ini Panel Terakhir dalam Roll)
                </h5>
              </div>
            </div>
          </label>

          {isLastPanel && (
            <div className="mt-4 pt-4 border-t border-sky-200/60 animate-fadeIn">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-sky-600 uppercase">Tanggal Potong</label>
                <input 
                  type="date" 
                  {...register("tanggalPotong")} 
                  className="h-10 px-3 rounded-lg bg-white border border-sky-200 text-sm font-semibold focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none shadow-sm" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Kirim Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
        >
          {isSubmitting ? (
            <><RefreshCw className="w-5 h-5 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-5 h-5" /> {isEdit ? "Simpan Perubahan" : "Kirim Laporan Panel"}</>
          )}
        </button>
      </form>

      {/* Modal Sukses */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={handleCloseSuccess}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-scaleIn text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">
              {(successData as any).isOfflineSaved ? "Tersimpan Offline" : "Laporan Berhasil Disimpan"}
            </h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              {(successData as any).isOfflineSaved 
                ? `Data Panel #${successData.panelNo} antre dikirim otomatis saat sinyal pulih.`
                : `Data laporan untuk Panel #${successData.panelNo} (Potongan ${successData.potonganKe}) telah terekam.`}
            </p>
            <button onClick={handleCloseSuccess} className="w-full py-3 bg-[#0070bc] text-white font-bold rounded-xl active:scale-95 transition-all text-sm">
              {isEdit ? "Kembali ke Riwayat" : "Input Panel Berikutnya"}
            </button>
          </div>
        </div>
      )}

      {/* Modal Peringatan/Error */}
      {errorMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setErrorMsg(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-scaleIn text-center relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">Peringatan!</h4>
            <p className="text-sm font-semibold text-slate-600 mt-2 mb-6 leading-relaxed">
              {errorMsg}
            </p>
            <button type="button" onClick={() => setErrorMsg(null)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-95 transition-all text-sm">
              Tutup & Perbaiki
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
