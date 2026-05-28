"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productionFormSchema, ProductionFormInput } from "@/lib/schemas";
import { useAuth } from "@/lib/auth-context";
import { createProductionReport, uploadProductionPhoto } from "@/actions/employee-actions";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, PlusCircle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, UploadCloud, X, Camera, ImageIcon } from "lucide-react";

// DATA FALLBACK DARI EXCEL (Jika Supabase belum disemai/seed)
const FALLBACK_OPERATORS = [
  { id: 1, name: "Rani" },
  { id: 2, name: "Rini" },
  { id: 3, name: "Neneng" },
  { id: 4, name: "Royana" },
  { id: 5, name: "Ridwan" },
  { id: 6, name: "Rina" },
  { id: 7, name: "Riki" },
  { id: 8, name: "Parid" },
  { id: 9, name: "Irfan" },
  { id: 10, name: "Sigit" },
  { id: 11, name: "Irma" },
  { id: 12, name: "Hardi" },
  { id: 13, name: "Gilang" },
  { id: 14, name: "Komara" },
  { id: 15, name: "Novi" },
  { id: 16, name: "Jaya" },
  { id: 17, name: "Ahmad" },
  { id: 18, name: "Rohmat" },
  { id: 19, name: "Devi" },
  { id: 20, name: "Anwar" },
  { id: 21, name: "Sandi" },
  { id: 22, name: "Yanti" },
  { id: 23, name: "Iki" }
].sort((a, b) => a.name.localeCompare(b.name));

const FALLBACK_DESIGNS = [
  { id: 1, name: "TCD 5826 XA" },
  { id: 2, name: "DL 5675 CO" },
  { id: 3, name: "DL 5167 CO" },
  { id: 4, name: "DL 5169 CO" },
  { id: 5, name: "DL 6460 CR" },
  { id: 6, name: "DL 5162 CO" },
  { id: 7, name: "DL 5168 CO" }
];

const FALLBACK_GROUPS = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
  { id: 3, name: "C" }
];

const PROBLEM_CATEGORIES = [
  "ELECTRIC",
  "MEKANIK",
  "ELEMENT RAJUTAN",
  "BAHAN BAKU",
  "MAINTENANCE/PERAWATAN",
  "GANTI DESIGN",
  "GANTI BENANG",
  "MESIN STOP"
];

const FALLBACK_PROBLEMS: Record<string, { id: number; code: string; desc: string }[]> = {
  "ELECTRIC": [
    { id: 1, code: "A.1", desc: "Mati Listrik" },
    { id: 2, code: "A.3", desc: "Error Servo Drive" },
    { id: 3, code: "A.5", desc: "Error Shogging" },
    { id: 4, code: "A.6", desc: "Error EBA" },
    { id: 5, code: "A.7", desc: "Error Jacquard" },
  ],
  "MEKANIK": [
    { id: 6, code: "B.5", desc: "Perbaikan tensioner" },
  ],
  "ELEMENT RAJUTAN": [
    { id: 7, code: "C.1", desc: "Perbaikan jarum pattern patah/bengkok" },
    { id: 8, code: "C.2", desc: "Perbaikan Jacquard" },
    { id: 9, code: "C.5", desc: "Perbaikan Keluar Jarum" },
    { id: 10, code: "C.7", desc: "Perbaikan bolong corak" },
    { id: 11, code: "C.9", desc: "Perbaikan Ngegaris/Stopline" },
  ],
  "BAHAN BAKU": [
    { id: 12, code: "D.5", desc: "Perbaikan benang narik/kendor" },
    { id: 13, code: "D.6", desc: "Perbaikan benang nyilang" },
    { id: 14, code: "D.7", desc: "Perbaikan benang pinggiran" },
    { id: 15, code: "D.8", desc: "Perbaikan benang kusut" },
    { id: 16, code: "D.9", desc: "Perbaikan L1/2/3 putus" },
    { id: 17, code: "D.10", desc: "Beset L1/L2/L3" },
    { id: 18, code: "D.13", desc: "Benang timbul putus" },
  ],
  "MAINTENANCE/PERAWATAN": [],
  "GANTI DESIGN": [
    { id: 19, code: "F.2", desc: "Perbaikan corak/revisi" },
  ],
  "GANTI BENANG": [],
  "MESIN STOP": [],
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

export default function EmployeeForm() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<ProductionFormInput & { id?: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States untuk dynamic dropdown dari Supabase
  const [operators, setOperators] = useState(FALLBACK_OPERATORS);
  const [designs, setDesigns] = useState(FALLBACK_DESIGNS);
  const [groups, setGroups] = useState(FALLBACK_GROUPS);
  const [dbProblems, setDbProblems] = useState<Record<string, { id: number; code: string; desc: string }[]>>(FALLBACK_PROBLEMS);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // UI state untuk form interaktif
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProblems, setSelectedProblems] = useState<Record<string, boolean>>({});

  // States untuk upload foto
  const [isUploading, setIsUploading] = useState<{ before: boolean; after: boolean }>({ before: false, after: false });
  const [previews, setPreviews] = useState<{ before: string | null; after: string | null }>({ before: null, after: null });

  // Hubungkan ke Supabase secara dinamis
  useEffect(() => {
    async function loadDbData() {
      try {
        const supabase = createClient();

        // Cek apakah Supabase URL terkonfigurasi
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
          return;
        }

        // Ambil data Operator
        const { data: opData } = await supabase.from("operators").select("id, nama_operator");
        if (opData && opData.length > 0) {
          setOperators(opData.map((o: any) => ({ id: o.id, name: o.nama_operator })));
          setIsDbConnected(true);
        }

        // Ambil data Design
        const { data: dsData } = await supabase.from("designs").select("id, nama_design");
        if (dsData && dsData.length > 0) {
          setDesigns(dsData.map((d: any) => ({ id: d.id, name: d.nama_design })));
        }

        // Ambil data Group
        const { data: gpData } = await supabase.from("groups").select("id, nama_grup");
        if (gpData && gpData.length > 0) {
          setGroups(gpData.map((g: any) => ({ id: g.id, name: g.nama_grup })));
        }

        // Ambil data Problems
        const { data: probData } = await supabase
          .from("problems")
          .select("id, kode_masalah, deskripsi_masalah, category_id, problem_categories(nama_kategori)");

        if (probData && probData.length > 0) {
          const categorized: Record<string, { id: number; code: string; desc: string }[]> = {};
          PROBLEM_CATEGORIES.forEach(cat => { categorized[cat] = []; });

          probData.forEach((p: any) => {
            const catName = p.problem_categories?.nama_kategori || "MESIN STOP";
            if (!categorized[catName]) categorized[catName] = [];
            categorized[catName].push({
              id: p.id,
              code: p.kode_masalah || "",
              desc: p.deskripsi_masalah || ""
            });
          });
          setDbProblems(categorized);
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
    formState: { errors },
  } = useForm<ProductionFormInput>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      operatorId: "3", // Rani (ID 3 atau menyesuaikan)
      groupId: "2",    // Grup B (ID 2)
      designId: "1",   // TCD 5826 XA (ID 1)
      rpm: "",
      potonganKe: "",
      panelNo: "",
      course: "",
      pcs: "",
      jmlHasilProduksi: "",
      statusInspeksi: "lolos",
      keterangan: "",
      pic: "",
      problems: {},
      fotoBefore: null,
      fotoAfter: null,
    },
  });

  // Watchers untuk kalkulasi otomatis dan conditional UI
  const watchJmlHasil = watch("jmlHasilProduksi");
  const watchStatusInspeksi = watch("statusInspeksi");

  // Tampilkan form masalah jika status inspeksi = "recheck"
  useEffect(() => {
    if (watchStatusInspeksi === "lolos") {
      // Reset pelaporan masalah jika status kembali menjadi "lolos"
      setSelectedProblems({});
      setValue("problems", {});
    }
  }, [watchStatusInspeksi, setValue]);

  const onSubmit = async (data: ProductionFormInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    // Filter masalah hanya untuk kategori yang diaktifkan oleh operator
    const cleanedProblems: Record<string, { problemId: string; keterangan?: string | null }> = {};
    Object.entries(selectedProblems).forEach(([cat, isActive]) => {
      if (isActive && data.problems?.[cat]) {
        cleanedProblems[cat] = data.problems[cat];
      }
    });

    const finalData = {
      ...data,
      problems: Object.keys(cleanedProblems).length > 0 ? cleanedProblems : null
    };

    try {
      const result = await createProductionReport(finalData);
      if (result.success) {
        setSuccessData({ ...finalData, id: result.productionId });
      } else {
        setErrorMsg(result.error || "Gagal menyimpan laporan produksi rajut.");
      }
    } catch (err) {
      setErrorMsg("Terjadi kesalahan jaringan atau server saat memproses laporan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessData(null);
    setSelectedProblems({});
    reset({
      operatorId: "3",
      groupId: "2",
      designId: "1",
      rpm: "",
      potonganKe: "",
      panelNo: "",
      course: "",
      pcs: "",
      jmlHasilProduksi: "",
      statusInspeksi: "lolos",
      keterangan: "",
      pic: "",
      problems: {},
      fotoBefore: null,
      fotoAfter: null,
    });
    setPreviews({ before: null, after: null });
  };

  const toggleCategoryProblem = (cat: string) => {
    setSelectedProblems(prev => {
      const isCurrentlyActive = !!prev[cat];
      const nextState = !isCurrentlyActive;

      if (!nextState) {
        // Hapus input data masalah dari form state jika di-uncheck
        const currentProblems = watch("problems") || {};
        const { [cat]: _, ...rest } = currentProblems;
        setValue("problems", rest);
      } else {
        // Pasang nilai default jika di-check agar Zod tidak error
        const firstProbId = dbProblems[cat]?.[0]?.id.toString() || "";
        setValue(`problems.${cat}.problemId`, firstProbId);
        setValue(`problems.${cat}.keterangan`, "");
      }

      return { ...prev, [cat]: nextState };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(prev => ({ ...prev, [type]: true }));
      setErrorMsg(null);

      // 1. Compress image client-side to save bandwidth and server memory
      const compressedFile = await compressImage(file);

      // Create local preview immediately from compressed file for better UX
      const objectUrl = URL.createObjectURL(compressedFile);
      setPreviews(prev => ({ ...prev, [type]: objectUrl }));

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")) {
        await new Promise(r => setTimeout(r, 1000));
        setValue(type === 'before' ? 'fotoBefore' : 'fotoAfter', `mock_url_${type}_${Date.now()}`);
        setIsUploading(prev => ({ ...prev, [type]: false }));
        return;
      }

      // 2. Convert compressed file to Base64
      const base64Data = await fileToBase64(compressedFile);

      // 3. Generate secure random filename
      const fileExt = "jpg"; // Compressed output is always jpeg
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // 4. Upload server-side via Server Action (bypasses Storage RLS using Admin Client)
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

  const getOperatorName = (id: string) => {
    return operators.find(o => o.id.toString() === id)?.name || id;
  };

  const getGroupName = (id: string) => {
    return groups.find(g => g.id.toString() === id)?.name || `Grup ${id}`;
  };

  const getDesignName = (id: string) => {
    return designs.find(d => d.id.toString() === id)?.name || id;
  };

  return (
    <div className="w-full max-w-3xl bg-white border border-[#e9ecef] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.015)] text-slate-800 relative overflow-hidden">
      {/* Header Info */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6 gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Form Laporan Produksi</h3>
          <p className="text-xs text-slate-400 font-normal mt-1">
            Isi parameter produksi mesin rajut standar sesuai isian lembar kontrol harian.
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-medium transition-colors ${isDbConnected
          ? "bg-slate-50 text-slate-600 border-slate-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
          <RefreshCw className={`w-3 h-3 ${isDbConnected ? "text-slate-400" : "text-amber-500 animate-spin"}`} strokeWidth={2} />
          {isDbConnected ? "Supabase Terhubung" : "Mode Offline Excel"}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50/50 border border-red-100 text-red-700 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" strokeWidth={2} />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SECTION 1: Informasi Dasar */}
        <div className="bg-slate-50/50 border border-slate-200/60 rounded-[20px] p-5 sm:p-6 space-y-5">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">1. Lembar Kontrol Utama</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            {/* Operator */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nama Operator</label>
              <select
                {...register("operatorId")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all cursor-pointer"
              >
                {operators.map(op => (
                  <option key={op.id} value={op.id.toString()}>{op.name}</option>
                ))}
              </select>
            </div>

            {/* Shift Group */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Grup Shift</label>
              <select
                {...register("groupId")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all cursor-pointer"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.id.toString()}>Grup {g.name}</option>
                ))}
              </select>
            </div>

            {/* Design Pola */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pola Desain</label>
              <select
                {...register("designId")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all cursor-pointer"
              >
                {designs.map(d => (
                  <option key={d.id} value={d.id.toString()}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            {/* PIC */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">PIC (Person in Charge - Opsional)</label>
              <input
                type="text"
                {...register("pic")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all"
                placeholder="Contoh: Budi, Loper, dll."
              />
            </div>

            {/* Course */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Course (Opsional)</label>
              <input
                type="text"
                {...register("course")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all"
                placeholder="Contoh: 3400"
              />
              {errors.course && <span className="text-red-500 text-[10px] font-bold mt-0.5">{errors.course.message}</span>}
            </div>
          </div>
        </div>

        {/* SECTION 2: Parameter Mesin & Hasil */}
        <div className="bg-slate-50/50 border border-slate-200/60 rounded-[20px] p-5 sm:p-6 space-y-5">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">2. Parameter Mesin & Hasil</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {/* RPM */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">RPM (Opsional)</label>
              <input
                type="text"
                {...register("rpm")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all"
                placeholder="Mesin RPM"
              />
              {errors.rpm && <span className="text-red-500 text-[10px] font-bold mt-0.5">{errors.rpm.message}</span>}
            </div>

            {/* Potongan Ke */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Potongan Ke-</label>
              <input
                type="text"
                {...register("potonganKe")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all"
                placeholder="Contoh: 62"
              />
              {errors.potonganKe && <span className="text-red-500 text-[10px] font-bold mt-0.5">{errors.potonganKe.message}</span>}
            </div>

            {/* Nomor Panel */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">No. Panel</label>
              <input
                type="text"
                {...register("panelNo")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all"
                placeholder="Panel #"
              />
              {errors.panelNo && <span className="text-red-500 text-[10px] font-bold mt-0.5">{errors.panelNo.message}</span>}
            </div>

            {/* Jumlah Hasil Aktual */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Jumlah Hasil (PCS)</label>
              <input
                type="text"
                {...register("jmlHasilProduksi")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-semibold outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all"
                placeholder="Total PCS"
              />
              {errors.jmlHasilProduksi && <span className="text-red-500 text-[10px] font-bold mt-0.5">{errors.jmlHasilProduksi.message}</span>}
            </div>
          </div>
        </div>

        {/* SECTION 3: Kualitas & Inspeksi */}
        <div className="bg-slate-50/50 border border-slate-200/60 rounded-[20px] p-5 sm:p-6 space-y-5">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">3. Kualitas & Inspeksi</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">

            {/* Status Inspeksi */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status Inspeksi Sementara</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "lolos", label: "Lolos QC (GRADE A)", color: "has-[:checked]:bg-[#0070bc] has-[:checked]:border-[#0070bc] has-[:checked]:text-white shadow-xs" },
                  { value: "recheck", label: "Recheck QC / Ada Deviasi", color: "has-[:checked]:bg-rose-50/50 has-[:checked]:border-rose-300 has-[:checked]:text-rose-700" }
                ].map((item) => (
                  <label
                    key={item.value}
                    className={`flex items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:bg-slate-50/50 hover:border-slate-350 transition-all font-semibold text-xs select-none text-slate-500 ${item.color}`}
                  >
                    <input
                      type="radio"
                      value={item.value}
                      {...register("statusInspeksi")}
                      className="sr-only"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Keterangan Tambahan */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Keterangan Umum Laporan</label>
              <input
                type="text"
                {...register("keterangan")}
                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-sm font-medium outline-none focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 transition-all"
                placeholder="Kondisi mesin rajut, cacat kain, dll."
              />
            </div>
          </div>

          {/* DYNAMIC PROBLEMS REPORTING SECTION */}
          {watchStatusInspeksi === "recheck" && (
            <div className="mt-4 border-t border-slate-100 pt-5 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-red-650">
                  Daftar Pelaporan Masalah & Deviasi (Multi-Kategori)
                </h5>
              </div>
              <p className="text-[10px] text-slate-450 font-normal leading-normal mb-3">
                Silakan centang satu atau lebih kategori kendala di bawah yang terjadi selama produksi untuk mencatat kode masalah dan keterangannya secara terperinci.
              </p>

              <div className="space-y-3">
                {PROBLEM_CATEGORIES.map((cat) => {
                  const isActive = !!selectedProblems[cat];
                  const catProbs = dbProblems[cat] || [];
                  const isDropdownOpen = activeCategory === cat;

                  return (
                    <div key={cat} className={`border rounded-xl overflow-hidden transition-all duration-200 bg-white ${isActive
                      ? "border-red-200 shadow-xs"
                      : "border-slate-200/80 hover:border-slate-300"
                      }`}>
                      {/* Accordion / Category Header */}
                      <div className="flex items-center justify-between p-3.5 select-none bg-slate-50/50">
                        <label className="flex items-center gap-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleCategoryProblem(cat)}
                            className="w-4.5 h-4.5 text-red-600 bg-white border-slate-300 rounded-md focus:ring-red-500"
                          />
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-red-700" : "text-slate-500"}`}>
                            {cat}
                          </span>
                        </label>

                        {isActive && (
                          <button
                            type="button"
                            onClick={() => setActiveCategory(isDropdownOpen ? null : cat)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            {isDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Accordion / Category Body */}
                      {isActive && (isDropdownOpen || !activeCategory) && (
                        <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                          {/* Problem Dropdown */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Kode & Jenis Masalah</label>
                            {catProbs.length > 0 ? (
                              <select
                                {...register(`problems.${cat}.problemId` as any)}
                                className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:bg-white focus:border-red-300 focus:ring-4 focus:ring-red-500/5 cursor-pointer"
                              >
                                {catProbs.map(p => (
                                  <option key={p.id} value={p.id.toString()}>
                                    {p.code} - {p.desc}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center text-[10px] text-slate-400 font-semibold italic">
                                Belum ada daftar kode masalah untuk kategori ini
                              </div>
                            )}
                          </div>

                          {/* Problem Additional Description */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-red-600 uppercase tracking-wider">Keterangan Tambahan / Lokasi Deviasi</label>
                            <input
                              type="text"
                              {...register(`problems.${cat}.keterangan` as any)}
                              className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium outline-none focus:bg-white focus:border-red-300 focus:ring-4 focus:ring-red-500/5"
                              placeholder="Misal: Retak jarum di B.65, ring patah..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Dokumentasi Foto (Before & After) */}
        <div className="bg-slate-50/50 border border-slate-200/60 rounded-[20px] p-5 sm:p-6 space-y-5">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">4. Dokumentasi Foto Mesin</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* FOTO BEFORE */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Foto Sebelum Perbaikan (Before)</label>

              <div className="relative w-full h-32 sm:h-40 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all overflow-hidden flex items-center justify-center group">
                {previews.before ? (
                  <>
                    <img src={previews.before} alt="Preview Before" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={() => removePhoto('before')} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center pointer-events-none">
                    {isUploading.before ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Camera className="w-5 h-5 text-slate-300" />
                          <UploadCloud className="w-5 h-5 text-slate-300" />
                        </div>
                        <span className="text-[10px] font-medium px-2">Ketuk untuk Ambil Foto / Unggah (Opsional)</span>
                      </>
                    )}
                  </div>
                )}

                {!previews.before && (
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    onChange={(e) => handlePhotoUpload(e, 'before')}
                    disabled={isUploading.before}
                  />
                )}
              </div>
            </div>

            {/* FOTO AFTER */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Foto Sesudah Perbaikan (After)</label>

              <div className="relative w-full h-32 sm:h-40 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all overflow-hidden flex items-center justify-center group">
                {previews.after ? (
                  <>
                    <img src={previews.after} alt="Preview After" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={() => removePhoto('after')} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center pointer-events-none">
                    {isUploading.after ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Camera className="w-5 h-5 text-slate-300" />
                          <UploadCloud className="w-5 h-5 text-slate-300" />
                        </div>
                        <span className="text-[10px] font-medium px-2">Ketuk untuk Ambil Foto / Unggah (Opsional)</span>
                      </>
                    )}
                  </div>
                )}

                {!previews.after && (
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    onChange={(e) => handlePhotoUpload(e, 'after')}
                    disabled={isUploading.after}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Kirim Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11.5 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-[0.99] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-sky-900/10 mt-4 select-none"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memproses...
            </>
          ) : (
            "Kirim Laporan Produksi"
          )}
        </button>
      </form>

      {/* Modal Sukses Premium */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center text-xl mb-4 shadow-xs shrink-0 select-none">
              ✓
            </div>
            <h4 className="text-base font-bold text-slate-800 text-center">Laporan Produksi Terkirim</h4>
            <p className="text-[11px] text-slate-400 font-semibold mt-1 text-center">
              Data laporan harian Anda berhasil disimpan ke database Supabase dan disinkronkan.
            </p>

            {/* Summary Data Card */}
            <div className="w-full bg-[#FAFAFA] border border-slate-150 rounded-2xl p-5 my-5 text-xs space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                <span className="text-slate-450 font-bold text-[10px] uppercase tracking-wider">ID Laporan:</span>
                <span className="font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                  {successData.id || "N/A"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Operator:</span>
                  <span className="font-semibold text-slate-700">{getOperatorName(successData.operatorId)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Grup Shift:</span>
                  <span className="font-semibold text-slate-700">Grup {getGroupName(successData.groupId)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Pola Desain:</span>
                  <span className="font-semibold text-slate-700">{getDesignName(successData.designId)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Course / RPM:</span>
                  <span className="font-semibold text-slate-700">{successData.course || "N/A"} / {successData.rpm || "N/A"} RPM</span>
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-2.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Potongan / No. Panel:</span>
                  <span className="font-semibold text-slate-700">Potongan ke-{successData.potonganKe} / Panel #{successData.panelNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Hasil Produksi:</span>
                  <span className="font-bold text-slate-700">{successData.jmlHasilProduksi} Pcs</span>
                </div>
                {successData.pic && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-semibold">PIC:</span>
                    <span className="font-semibold text-slate-700">{successData.pic}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400 font-semibold">Inspeksi Awal Loper:</span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${successData.statusInspeksi === "lolos"
                    ? "bg-[#0070bc] text-white"
                    : "bg-red-50 text-red-600 border border-red-200/60"
                    }`}>
                    {successData.statusInspeksi === "lolos" ? "Lolos (Grade A)" : "Recheck (Ada Kendala)"}
                  </span>
                </div>
              </div>

              {/* Tampilkan Daftar Masalah */}
              {successData.problems && Object.keys(successData.problems).length > 0 && (
                <div className="border-t border-slate-200/50 pt-2.5 space-y-1.5">
                  <span className="text-red-650 font-bold text-[9px] uppercase tracking-wider block">
                    Kendala / Masalah Dilaporkan:
                  </span>
                  <div className="space-y-1">
                    {Object.entries(successData.problems).map(([cat, details]) => {
                      const probList = dbProblems[cat] || [];
                      const matchedProb = probList.find(p => p.id.toString() === details.problemId);
                      return (
                        <div key={cat} className="bg-white border border-slate-200/80 rounded-xl p-2.5 text-[11px] leading-relaxed">
                          <div className="flex justify-between font-bold">
                            <span className="text-slate-400 uppercase tracking-widest text-[8px]">{cat}</span>
                            <span className="text-red-650 font-mono text-[8px]">
                              {matchedProb?.code || "N/A"}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-700 mt-0.5">
                            {matchedProb?.desc || "Deteksi Masalah Lain"}
                          </div>
                          {details.keterangan && (
                            <div className="text-slate-500 font-medium italic mt-0.5 border-t border-slate-100 pt-1">
                              Detail: &quot;{details.keterangan}&quot;
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tampilkan Thumbnails jika ada */}
              {(successData.fotoBefore || successData.fotoAfter) && (
                <div className="border-t border-slate-200/50 pt-3 flex gap-3 justify-center">
                  {successData.fotoBefore && (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Before</span>
                      <img src={successData.fotoBefore} alt="Before" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                    </div>
                  )}
                  {successData.fotoAfter && (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase">After</span>
                      <img src={successData.fotoAfter} alt="After" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleCloseSuccess}
              className="w-full py-3 bg-[#0070bc] hover:bg-[#004777] text-white font-semibold rounded-xl transition-all cursor-pointer shadow-sm text-xs shrink-0 select-none"
            >
              Kembali ke Formulir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
