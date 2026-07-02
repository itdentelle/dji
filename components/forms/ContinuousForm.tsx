"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { continuousFormSchema, ContinuousFormInput } from "@/lib/schemas";
import { useAuth } from "@/lib/auth-context";
import { uploadProductionPhoto, getLastPanelNoByPotongan } from "@/actions/employee-actions";
import { submitContinuousReport, updateContinuousReport } from "@/actions/continuous-actions";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, RefreshCw, UploadCloud, X, Camera, Database, FileText, Settings2, Trash2, ChevronUp, ChevronDown, CheckCircle2, Save, Plus, Box, ClipboardList, Play, Square, Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import HeaderSummaryCard from "./HeaderSummaryCard";
import ProductionHeaderModal from "./ProductionHeaderModal";

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

type ContinuousFormProps = {
  initialData?: any;
  isEdit?: boolean;
};

export default function ContinuousForm({ initialData, isEdit }: ContinuousFormProps = {}) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<ContinuousFormInput & { id?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  // States untuk dynamic dropdown dari Supabase
  const [operators, setOperators] = useState(FALLBACK_OPERATORS);
  const [designs, setDesigns] = useState(FALLBACK_DESIGNS);
  const [groups, setGroups] = useState(FALLBACK_GROUPS);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Accordion UI State
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);

  // Pop-up Modal State
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [isLastRoll, setIsLastRoll] = useState(false);

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
    
    // Calculate elapsed seconds
    const elapsedMs = Date.now() - (timerStartRef || Date.now());
    const elapsedSecs = Math.ceil(elapsedMs / 1000);
    
    const currentTotalStr = watch("totalDowntime");
    const currentTotal = parseInt(currentTotalStr || "0") || 0;
    
    const newTotal = currentTotal + elapsedSecs;
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
    getValues,
    formState: { errors },
  } = useForm<ContinuousFormInput>({
    resolver: zodResolver(continuousFormSchema),
    defaultValues: {
      operatorId: "3", 
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
      totalDowntime: "",
      meterAwal: "",
      meterAkhir: "",
      hasilProduksiMeter: "",
      pcsData: [
        {
          pcsIndex: "1",
          jmlHasilProduksi: "0",
          meterKain: "",
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
        operatorId: String(initialData.operator_id || ""),
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
        totalDowntime: String(initialData.total_downtime_detik || ""),
        meterAwal: String(initialData.meter_awal || ""),
        meterAkhir: String(initialData.meter_akhir || ""),
        hasilProduksiMeter: String(initialData.total_produksi_meter || ""),
        pcsData: initialData.details && initialData.details.length > 0 ? initialData.details.map((d: any) => ({
          pcsIndex: String(d.pcs_index || "1"),
          jmlHasilProduksi: "0",
          meterKain: d.meter_kain || "",
          indikatorStop: d.kategori_masalah ? true : false,
          kategoriMasalah: d.kategori_masalah ? d.kategori_masalah.split(', ') : [],
          detailMasalah: d.detail_masalah || "",
          keteranganCacat: d.keterangan_cacat || "",
          rollNo: d.roll_no || "",
        })) : [
          {
            pcsIndex: "1",
            jmlHasilProduksi: "0",
            meterKain: "",
            indikatorStop: false,
            kategoriMasalah: [],
            detailMasalah: "",
            keteranganCacat: "",
            rollNo: "",
          }
        ]
      });
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

  // Auto calculate total hasil produksi meter
  const watchMeterAwal = watch("meterAwal");
  const watchMeterAkhir = watch("meterAkhir");

  useEffect(() => {
    if (watchMeterAwal && watchMeterAkhir) {
      const awal = parseFloat(watchMeterAwal);
      const akhir = parseFloat(watchMeterAkhir);
      if (!isNaN(awal) && !isNaN(akhir)) {
        setValue("hasilProduksiMeter", String(Math.abs(akhir - awal)));
      }
    }
  }, [watchMeterAwal, watchMeterAkhir, setValue]);

  // Load Draft or Header Data dari LocalStorage
  useEffect(() => {
    if (isEdit) return;

    const savedDraft = localStorage.getItem('dji_form_draft_continuous');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        reset(parsed);
        setIsHeaderModalOpen(false);
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
                meterKain: "",
                indikatorStop: false,
                kategoriMasalah: [],
                detailMasalah: "",
                keteranganCacat: "",
                rollNo: rollVal,
              }];
              setValue("pcsData", currentPcs);
            }
          } else {
            setValue(key as keyof ContinuousFormInput, parsed[key]);
          }
        });
        // Jika ada header yang di-load, tutup modal header
        setIsHeaderModalOpen(false);
      } catch (e) {
        console.error("Gagal load header dari storage", e);
      }
    }
  }, [setValue, isEdit, reset]);

  // Subscribe to all form changes to save draft
  useEffect(() => {
    if (isEdit) return;
    const subscription = watch((value) => {
      localStorage.setItem('dji_form_draft_continuous', JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch, isEdit]);



  const onSubmit = async (data: ContinuousFormInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // Generate idempotency key
    data.idempotencyKey = crypto.randomUUID();

    // Check if operatorId is in activeOperators
    const isValidOperator = activeOperators.some((op: any) => op.id.toString() === data.operatorId);
    if (!isValidOperator) {
      setErrorMsg("Silakan pilih operator yang sesuai dengan shift.");
      setIsSubmitting(false);
      return;
    }
    
    // Ambil nama operator dan simpan ke PIC
    data.pic = getOperatorName(data.operatorId) || "";
    data.grupName = getGroupName(data.groupId);
    data.designName = getDesignName(data.designId);
    data.created_by_name = user?.fullName || null;

    // Save Header Data to LocalStorage automatically on submit
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
      meterAwal: data.meterAwal,
      meterAkhir: data.meterAkhir,
      hasilProduksiMeter: data.hasilProduksiMeter,
      lastRollNo: lastRollNo,
    };
    localStorage.setItem('dji_form_header', JSON.stringify(headerDataToSave));

    try {
      if (!navigator.onLine) {
        const { addPendingPayload } = await import("@/lib/offline-store");
        await addPendingPayload("continuous", data);
        localStorage.removeItem('dji_form_draft_continuous');
        setSuccessData({ ...data, isOfflineSaved: true } as any);
        return;
      }

      let result;
      if (isEdit && initialData?.id) {
        result = await updateContinuousReport(initialData.id, data);
      } else {
        result = await submitContinuousReport(data);
      }
      
      if (result.success) {
        localStorage.removeItem('dji_form_draft_continuous');
        setSuccessData({ ...data, id: isEdit ? initialData.id : (result as any).productionId });
      } else {
        setErrorMsg(result.error || "Gagal menyimpan laporan produksi rajut.");
      }
    } catch (err: any) {
      if (err.message?.includes("fetch") || err.message?.includes("Network") || !navigator.onLine) {
         const { addPendingPayload } = await import("@/lib/offline-store");
         await addPendingPayload("continuous", data);
         localStorage.removeItem('dji_form_draft_continuous');
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
      localStorage.removeItem('dji_form_draft_continuous');
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
        totalDowntime: "",
        meterAwal: "",
        meterAkhir: "",
        hasilProduksiMeter: "",
        pcsData: [{
          pcsIndex: "1",
          jmlHasilProduksi: "",
          indikatorStop: false,
          kategoriMasalah: [],
          detailMasalah: "",
          keteranganCacat: "",
        }]
      });
      setIsLastRoll(false);
      setIsHeaderModalOpen(true);
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
      meterKain: "",
      rollNo: pcs.rollNo || "",
      indikatorStop: false,
      kategoriMasalah: [],
      detailMasalah: "",
      keteranganCacat: "",
    }));

    reset({
      ...watch(),
      
      pcsData: newPcsData.length > 0 ? newPcsData : [{
        pcsIndex: "1",
        jmlHasilProduksi: "1",
        meterKain: "",
        rollNo: "",
        indikatorStop: false,
        kategoriMasalah: [],
        detailMasalah: "",
        keteranganCacat: "",
      }],
      totalDowntime: "",
      meterAwal: "",
      meterAkhir: "",
      hasilProduksiMeter: "",
    });
    setIsLastRoll(false);
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
    <div className="w-full bg-gradient-to-br from-emerald-50/40 via-white to-white border border-[#e9ecef] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(16,185,129,0.06)] text-slate-800 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none z-0"></div>
      
      <div className="relative z-10">
      {/* Segmented Control for Mode Switching */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-8 border border-slate-200/60 shadow-inner">
        <a href="/input" className="flex-1 flex items-center justify-center py-3.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white/60 transition-all cursor-pointer">
          <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
              <Box className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-bold uppercase tracking-wider leading-none">Panel</span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5">Input per Potongan</span>
            </div>
          </div>
        </a>
        <div className="flex-1 flex items-center justify-center py-3.5 rounded-xl bg-white shadow-sm border border-slate-200 text-emerald-600 relative overflow-hidden group cursor-default">
          <div className="absolute inset-0 bg-emerald-50/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <div className="relative flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-black uppercase tracking-wider leading-none">Kontinu (Meteran)</span>
              <span className="text-[10px] font-bold text-slate-400 mt-0.5">Input per Roll</span>
            </div>
          </div>
        </div>
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


      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50/50 border border-red-100 text-red-700 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" strokeWidth={2} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white border border-slate-200 shadow-sm rounded-[20px] p-5 sm:p-6">
          
          {/* Tombol Pemicu Pop-up Meteran */}
          <div className="bg-emerald-50/80 border border-emerald-200 shadow-sm rounded-[20px] p-5 sm:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-emerald-800">Laporan Hasil Akhir (Shift / Roll)</h4>
              <p className="text-[10px] text-emerald-600 mt-1">Gunakan tombol di samping jika gulungan telah dipotong atau shift selesai.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMeterModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Lapor Meteran Akhir
            </button>
          </div>

          <HeaderSummaryCard
            operatorName={activeOperators.find(op => op.id.toString() === watch("operatorId"))?.name || ""}
            shiftName={activeShiftName}
            nomorMc={watch("nomorMc") || ""}
            design={watch("designId") || ""}
            statusMatching={watch("statusMatching") || ""}
            potonganKe={watch("potonganKe")}
            onEdit={() => setIsHeaderModalOpen(true)}
          />

          <ProductionHeaderModal
            isOpen={isHeaderModalOpen}
            onClose={() => setIsHeaderModalOpen(false)}
            register={register}
            errors={errors}
            watch={watch}
            groups={groups}
            operators={activeOperators}
            activeShiftName={activeShiftName}
            onClearHeader={handleClearHeader}
          />





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
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors"
                        title="Hapus PCS"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="mt-4">
                      {/* Hidden Jml Hasil Produksi */}
                      <input type="hidden" {...register(`pcsData.${index}.jmlHasilProduksi` as const)} />
                      <div className="flex flex-col gap-1 w-full sm:w-1/2">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase">Posisi Meter Kain</label>
                        <input type="text" {...register(`pcsData.${index}.meterKain` as const)} className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm focus:border-sky-400 outline-none transition-all shadow-sm" placeholder="Contoh: 15.5" />
                        {errors.pcsData?.[index]?.meterKain && <span className="text-red-500 text-[10px] font-bold">{errors.pcsData[index]?.meterKain?.message}</span>}
                      </div>
                    </div>

                    <div className={`mt-4 border rounded-xl overflow-hidden transition-all duration-300 ${watchIndikator ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
                      <label className="flex items-center justify-between p-4 cursor-pointer select-none">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            {...register(`pcsData.${index}.indikatorStop` as const)} 
                            onChange={(e) => {
                              register(`pcsData.${index}.indikatorStop` as const).onChange(e);
                              if (e.target.checked) {
                                if (!isTimerRunning) handleStartTimer();
                              } else {
                                setTimeout(() => {
                                  const currentPcsData = getValues("pcsData") || [];
                                  if (!currentPcsData.some(p => p.indikatorStop)) {
                                    if (isTimerRunning) {
                                      setIsTimerRunning(false);
                                      setTimerStartRef(null);
                                      setLiveTimerSeconds(0);
                                    }
                                    setValue("totalDowntime", "");
                                  }
                                }, 10);
                              }
                            }}
                            className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer" 
                          />
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
                              <span className="text-red-500 text-[10px] font-bold mt-1">
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
              {fields.length === 0 && (
                <div className="w-full p-6 border-2 border-dashed border-slate-200 rounded-2xl flex justify-center mb-4">
                  <p className="text-sm text-slate-400 font-medium">Belum ada PCS yang dicatat.</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => append({
                  pcsIndex: String(fields.length + 1),
                  jmlHasilProduksi: "0",
                  meterKain: "",
                  indikatorStop: false, // Default is not a defect
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
                Waktu henti mesin akan tercatat otomatis saat timer berjalan.
              </p>
              <div className="relative flex items-center gap-4 mt-2">
                <div className="relative w-32 shrink-0">
                  <input 
                    type="number" 
                    {...register("totalDowntime")} 
                    className="w-full h-14 pl-4 pr-12 rounded-2xl bg-white/50 border-2 border-orange-200 text-xl font-black text-orange-700 focus:outline-none transition-all shadow-inner cursor-not-allowed" 
                    placeholder="0" 
                    readOnly
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 text-[10px] font-bold uppercase">Detik</span>
                </div>
                
                {/* Timer Controls */}
                <div className="flex-1">
                  {!isTimerRunning ? (
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      className="flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wide rounded-2xl transition-all shadow-md shadow-orange-500/20 active:scale-[0.98]"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Mulai Timer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopTimer}
                      className="flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black text-sm uppercase tracking-wide rounded-2xl transition-all shadow-md shadow-red-500/20 animate-pulse active:scale-[0.98]"
                    >
                      <Square className="w-5 h-5 fill-current" />
                      Stop ({formatTimer(liveTimerSeconds)})
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

        {/* Global Error Validation for PCS Data */}
        {(errors.pcsData as any)?.message && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs font-bold text-red-600">{(errors.pcsData as any)?.message}</p>
          </div>
        )}
        {(errors.pcsData as any)?.root?.message && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-xs font-bold text-red-600">{(errors.pcsData as any)?.root?.message}</p>
          </div>
        )}

        {/* Potong Kain Toggle */}
        <div className={`p-5 border rounded-2xl transition-all duration-300 mb-6 ${isLastRoll ? 'bg-emerald-50 border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
          <label className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                checked={isLastRoll}
                onChange={(e) => {
                  setIsLastRoll(e.target.checked);
                  if (e.target.checked) {
                    setValue("tanggalPotong", new Date().toISOString().split('T')[0]);
                  } else {
                    setValue("tanggalPotong", "");
                  }
                }}
                className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer" 
              />
              <div>
                <h5 className={`text-sm font-bold ${isLastRoll ? 'text-emerald-700' : 'text-slate-600'}`}>
                  Potong Kain (Ini Potongan Terakhir dalam Roll)
                </h5>
              </div>
            </div>
          </label>

          {isLastRoll && (
            <div className="mt-4 pt-4 border-t border-emerald-200/60 animate-fadeIn">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-emerald-600 uppercase">Tanggal Potong</label>
                <input 
                  type="date" 
                  {...register("tanggalPotong")} 
                  className="h-10 px-3 rounded-lg bg-white border border-emerald-200 text-sm font-semibold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none shadow-sm" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Kirim Button */}
        <button
          type="button"
          onClick={() => {
            // Karena ini tombol kirim form cacat, kosongkan meterAkhir agar validasi skema tetap masuk akal
            setValue("meterAwal", "");
            setValue("meterAkhir", "");
            handleSubmit(onSubmit)();
          }}
          disabled={isSubmitting}
          className="w-full h-12 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
        >
          {isSubmitting ? (
            <><RefreshCw className="w-5 h-5 animate-spin" /> Menyimpan...</>
          ) : (
            <><Save className="w-5 h-5" /> {isEdit ? "Simpan Perubahan Cacat" : "Kirim Laporan Titik Cacat"}</>
          )}
        </button>

        {/* Modal Pop-up Meteran */}
        {isMeterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setIsMeterModalOpen(false)}>
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col animate-scaleIn relative overflow-hidden" onClick={e => e.stopPropagation()}>
              {/* Background accent */}
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-10"></div>
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">Laporan Meteran</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Isi di akhir shift atau potong roll</p>
                  </div>
                </div>
                <button type="button" onClick={() => setIsMeterModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Start Meter</label>
                  <input type="number" step="any" {...register("meterAwal")} className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-base font-semibold focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all" placeholder="Contoh: 100" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Finish Meter</label>
                  <input type="number" step="any" {...register("meterAkhir")} className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-base font-semibold focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all" placeholder="Contoh: 250" />
                  {errors.meterAkhir && <span className="text-red-500 text-[10px] font-bold mt-0.5">{errors.meterAkhir.message}</span>}
                </div>
                
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mt-2">
                  <label className="text-[10px] font-bold text-emerald-800 uppercase flex justify-between items-center mb-1">
                    <span>Total Hasil Produksi</span>
                    <span className="text-[9px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-black uppercase">Auto Calculate</span>
                  </label>
                  <input type="number" step="any" {...register("hasilProduksiMeter")} className="w-full h-12 px-4 rounded-xl bg-white border border-emerald-300 text-lg font-black text-emerald-700 focus:border-emerald-500 outline-none shadow-sm text-right" placeholder="0" />
                </div>
              </div>

              <div className="flex gap-3 mt-8 relative z-10">
                <button type="button" onClick={() => setIsMeterModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-sm">
                  Batal
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsMeterModalOpen(false);
                    // Kita bisa hapus semua list pcs karena mereka cuman mau lapor meteran
                    // Ini trik supaya tidak kecampur dengan form titik cacat kosong
                    const currentPcs = watch("pcsData");
                    if (currentPcs && currentPcs.length === 0) {
                      // Do nothing, valid
                    }
                    handleSubmit(onSubmit)();
                  }}
                  disabled={isSubmitting}
                  className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex justify-center items-center gap-2 text-sm"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan & Kirim Meteran
                </button>
              </div>
            </div>
          </div>
        )}

      </form>

      {/* Modal Sukses */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-scaleIn text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800">
              {(successData as any).isOfflineSaved ? "Tersimpan Offline" : "Laporan Berhasil Disimpan"}
            </h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              {(successData as any).isOfflineSaved 
                ? `Data Potongan ke-${successData.potonganKe} antre dikirim otomatis saat sinyal pulih.`
                : `Data laporan untuk Potongan ke-${successData.potonganKe} telah terekam.`}
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
