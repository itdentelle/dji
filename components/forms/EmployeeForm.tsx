"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productionFormSchema, ProductionFormInput } from "@/lib/schemas";
import { useAuth } from "@/lib/auth-context";
import {
  createProductionReport,
  uploadProductionPhoto,
  getLastPanelNoByPotongan,
  updateProductionReport,
} from "@/actions/employee-actions";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  RefreshCw,
  UploadCloud,
  X,
  Camera,
  Database,
  FileText,
  Settings2,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Save,
  Plus,
  Box,
  ClipboardList,
  Play,
  Square,
  Timer,
  ArrowLeft,
  ArrowRight,
  Scissors,
} from "lucide-react";
import { useRouter } from "next/navigation";
import HeaderSummaryCard from "./HeaderSummaryCard";
import ProductionHeaderModal from "./ProductionHeaderModal";
import DowntimeTracker from "./DowntimeTracker";

// DATA FALLBACK DARI EXCEL
const FALLBACK_OPERATORS = [
  // Shift A
  { id: 1, name: "Rohmat", shift: "A" },
  { id: 2, name: "M.Alwi", shift: "A" },
  { id: 3, name: "Anwar", shift: "A" },
  { id: 4, name: "Jaya", shift: "A" },
  { id: 5, name: "Riki S", shift: "A" },
  { id: 6, name: "Sandi M", shift: "A" },
  { id: 7, name: "Padlan", shift: "A" },
  { id: 8, name: "Rissa A", shift: "A" },
  { id: 9, name: "Devi K", shift: "A" },
  { id: 10, name: "Novi S", shift: "A" },
  { id: 11, name: "Udin", shift: "A" },
  // Shift B
  { id: 12, name: "Irfan", shift: "B" },
  { id: 13, name: "Anton", shift: "B" },
  { id: 14, name: "Ahmad S", shift: "B" },
  { id: 15, name: "Saepudin", shift: "B" },
  { id: 16, name: "Parid", shift: "B" },
  { id: 17, name: "Noval", shift: "B" },
  { id: 18, name: "Sigit", shift: "B" },
  { id: 19, name: "Rani Y", shift: "B" },
  { id: 20, name: "Yanti P", shift: "B" },
  { id: 21, name: "Irma P", shift: "B" },
  { id: 22, name: "Aris W", shift: "B" },
  // Shift C
  { id: 23, name: "Tubagus", shift: "C" },
  { id: 24, name: "Andri Y", shift: "C" },
  { id: 25, name: "Royana", shift: "C" },
  { id: 26, name: "Komara", shift: "C" },
  { id: 27, name: "Sopian", shift: "C" },
  { id: 28, name: "Iki S", shift: "C" },
  { id: 29, name: "Hardi", shift: "C" },
  { id: 30, name: "Rini D", shift: "C" },
  { id: 31, name: "Neneng", shift: "C" },
  { id: 32, name: "Rina R", shift: "C" },
  { id: 33, name: "Farhan", shift: "C" },
];

const FALLBACK_DESIGNS = [
  { id: 1, name: "TCD 5826 XA" },
  { id: 2, name: "DL 5675 CO" },
  { id: 3, name: "DL 5167 CO" },
  { id: 4, name: "DL 5169 CO" },
  { id: 5, name: "DL 6460 CR" },
  { id: 6, name: "DL 5162 CO" },
  { id: 7, name: "DL 5168 CO" },
];

const FALLBACK_GROUPS = [
  { id: 1, name: "A" },
  { id: 2, name: "B" },
  { id: 3, name: "C" },
];

// NEW PROBLEM KATEGORI (A-H)
const NEW_PROBLEM_CATEGORIES = [
  { id: "A", name: "Kode A: Masalah dan Perbaikan Benang" },
  { id: "B", name: "Kode B: Perbaikan Jarum dan Element Rajutan (Mechanical)" },
  { id: "C", name: "Kode C: Pengaturan dan Design stup" },
  { id: "D", name: "Kode D: Bahan Baku dan penggantian Benang" },
  { id: "E", name: "Kode E: Masalah Kelistrikan" },
  { id: "F", name: "Kode F: Perawatan Mesin,Perbaikan Mekanik (maintenance)" },
  { id: "G", name: "Kode G: Faktor Eksternal dan Non-Teknis" },
];

const PANEL_TOUR_STEPS = [
  {
    target: "mode-switch",
    title: "Jenis Input",
    description:
      "Pastikan mode Panel aktif untuk input per panel. Kalau input per roll atau meteran, pindah ke Kontinu.",
  },
  {
    target: "header-summary",
    title: "Data Header",
    description:
      "Cek operator, shift, mesin, design, status matching, dan potongan. Tekan kartu ini untuk mengubah header.",
  },
  {
    target: "panel-info",
    title: "Nomor Panel",
    description:
      "Nomor panel terisi otomatis dari potongan dan mesin. Setelah kirim, sistem menyiapkan nomor berikutnya.",
  },
  {
    target: "pcs-detail",
    title: "Detail PCS",
    description:
      "Centang kalau ada cacat atau kendala pada PCS. Setelah dicentang, pilih kategori dan minimal satu detail masalah.",
  },
  {
    target: "pcs-detail",
    title: "Timer Downtime",
    description:
      "Saat kendala dicentang, timer downtime muncul di bawah detail PCS. Mulai saat masalah terjadi dan stop saat mesin kembali jalan.",
  },
  {
    target: "cut-panel",
    title: "Potong Kain",
    description:
      "Centang ini hanya jika panel yang sedang diinput adalah panel terakhir dalam roll.",
  },
  {
    target: "submit-panel",
    title: "Kirim Laporan",
    description:
      "Kirim setelah semua data benar. Kalau offline, data akan masuk antrean sinkronisasi otomatis.",
  },
];

const NEW_PROBLEMS: Record<string, string[]> = {
  A: [
    "L1,L2,L3 Benang timbul putus",
    "Benang lolos",
    "Bolong corak",
    "Benang narik/Kendor",
    "Benang Nyilang",
    "Perbaikan/Beset benang Dasar",
    "Benang Kejepit/Jebol/Kusut",
    "Jalur benang",
  ],
  B: [
    "Jarum pattern patah/bengkok",
    "Ganti Jacquard",
    "Ganti jarum Compoun Nedle, pattern",
    "Ngampul",
    "Ganti dari scaloop ke non scaloop atau sebaliknya",
    "Ngegaris/Stopline",
    "Keluar Jarum",
    "Ganti String bar",
    "Ganti PBO",
    "Pressan As beam kendor",
    "Tensi tensioner",
  ],
  C: [
    "Loading design/Ganti Design",
    "Perbaikan corak/revisi",
    "Salah ganti design",
    "Error design",
    "Proofing/PCB",
    "Ganti Pattern Disk",
    "Ganti pick",
  ],
  D: [
    "Ganti benang dasar L1/L2",
    "Salah ganti benang dasar",
    "Ganti benang Pattern Linner",
    "Ganti benang Pattern Heavy",
    "Ganti benang Pattern Shadow",
    "Ganti benang pattern keseluruhan (L,H,S)",
    "salah ganti benang pattern",
    "Ngelancarin",
    "Over Cone/Rewind",
    "Tunggu benang dasar dari warping",
    "Tunggu benang (benang belum datang)",
  ],
  E: [
    "Error Servo Drive",
    "Ganti motor servo",
    "Sensor Benang/Laser Stop",
    "Perbaikan Eletrik lainnya",
    "Konsleting",
    "Perbaikan listrik",
  ],
  F: [
    "Perbaikan cilynder Angin",
    "Ganti Bellow",
    "Perbaikan gear/Take Up Roll",
    "Ganti rantai/pertensi",
    "Ganti Black grip roll",
    "Ganti Oli",
    "Pelumasan/greace pada mesin",
    "Ganti Vanbelt",
    "Perawatan Panel Listrik",
    "Servis Overhaul",
  ],
  G: [
    "Hari Libur",
    "Tidak ada order",
    "Tunggu info",
    "Demo",
    "Bencana/gempa/banjir",
    "Istirahat selama buka puasa",
    "Tunggu Sparepart",
    "Mati Listrik",
  ],
};

// Client-side image compression helper
const compressImage = (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.7,
): Promise<File> => {
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
          quality,
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

export default function EmployeeForm({
  initialData,
  isEdit,
}: EmployeeFormProps = {}) {
  const { user } = useAuth();
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<
    (ProductionFormInput & { id?: string }) | null
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLastPanel, setIsLastPanel] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourRect, setTourRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Photo States
  const [fotoBefore, setFotoBefore] = useState<File | null>(null);
  const [fotoAfter, setFotoAfter] = useState<File | null>(null);

  const router = useRouter();

  // States untuk dynamic dropdown dari Supabase
  const [operators, setOperators] = useState(FALLBACK_OPERATORS);
  const [designs, setDesigns] = useState(FALLBACK_DESIGNS);
  const [groups, setGroups] = useState(FALLBACK_GROUPS);

  // Accordion UI State
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [highlightPotonganKe, setHighlightPotonganKe] = useState(false);
  const [showAdvancedActions, setShowAdvancedActions] = useState(false);

  // States untuk upload foto
  const [isUploading, setIsUploading] = useState<{
    before: boolean;
    after: boolean;
  }>({ before: false, after: false });
  const [previews, setPreviews] = useState<{
    before: string | null;
    after: string | null;
  }>({ before: null, after: null });



  useEffect(() => {
    const startPanelTour = () => {
      if (isEdit) return;
      setTourStepIndex(0);
      setIsTourOpen(true);
    };

    window.addEventListener("dji:start-panel-tour", startPanelTour);
    return () =>
      window.removeEventListener("dji:start-panel-tour", startPanelTour);
  }, [isEdit]);

  useEffect(() => {
    if (!isTourOpen) return;

    const currentStep = PANEL_TOUR_STEPS[tourStepIndex];
    const element = document.querySelector(
      `[data-tour="${currentStep.target}"]`,
    );

    const updateTourRect = () => {
      if (!element) {
        setTourRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setTourRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    const timeoutId = window.setTimeout(updateTourRect, 220);
    window.addEventListener("resize", updateTourRect);
    window.addEventListener("scroll", updateTourRect, true);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", updateTourRect);
      window.removeEventListener("scroll", updateTourRect, true);
    };
  }, [isTourOpen, tourStepIndex]);

  const closeTour = () => {
    setIsTourOpen(false);
    setTourStepIndex(0);
  };


  // Hubungkan ke Supabase secara dinamis
  useEffect(() => {
    async function loadDbData() {
      try {
        const supabase = createClient();
        if (
          !process.env.NEXT_PUBLIC_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
        ) {
          return;
        }

        const { data: opData } = await supabase
          .from("operators")
          .select("id, nama_operator");
        if (opData && opData.length > 0) {
          // KITA GUNAKAN FALLBACK DULU KARENA MINTA SESUAI GAMBAR BARU (SHIFT A,B,C)
          // setOperators(opData.map((o: any) => ({ id: o.id, name: o.nama_operator })));
        }

        const { data: dsData } = await supabase
          .from("designs")
          .select("id, nama_design");
        if (dsData && dsData.length > 0) {
          setDesigns(
            dsData.map((d: any) => ({ id: d.id, name: d.nama_design })),
          );
        }

        const { data: gpData } = await supabase
          .from("groups")
          .select("id, nama_grup");
        if (gpData && gpData.length > 0) {
          setGroups(gpData.map((g: any) => ({ id: g.id, name: g.nama_grup })));
        }
      } catch (err) {
        console.warn(
          "Koneksi Supabase real gagal atau belum disemai, menggunakan data fallback dari Excel.",
          err,
        );
      }
    }
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
  } = useForm<ProductionFormInput>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      operatorId: "3",
      groupId: "2",
      designId: "1",
      nomorMc: "",
      tanggalProduksi: new Date().toISOString().split("T")[0],
      tanggalPotong: "",
      pick: "",
      noOrderBarang: "",
      jenisBenangDasar: "",
      liner: "",
      heavy: "",
      shadow: "",
      pinggiran: "",
      rpm: "",
      statusMatching: "",
      potonganKe: "",
      course: "",
      pic: "",
      fotoBefore: null,
      fotoAfter: null,
      panelNo: "1",
      isPanelGagal: false,
      totalDowntime: "",
      pcsData: [
        {
          pcsIndex: "1",
          jmlHasilProduksi: "1",
        },
      ],
    },
  });

  useEffect(() => {
    if (initialData && isEdit) {
      let isIstirahat = false;
      if (initialData.details && initialData.details.length > 0) {
        isIstirahat = initialData.details.some((d: any) => 
          (d.keterangan_cacat || "").toUpperCase().includes("ISTIRAHAT") ||
          (d.detail_masalah || "").toUpperCase().includes("ISTIRAHAT")
        );
      }
      
      let parsedDowntimeEvents: any[] = [];
      try {
        if (initialData.downtime_events) {
          parsedDowntimeEvents = typeof initialData.downtime_events === 'string'
            ? JSON.parse(initialData.downtime_events)
            : initialData.downtime_events;
        }
      } catch (e) {
        console.error("Error parsing downtime_events", e);
      }
      
      let rawPanelNo = String(initialData.panel_no || "1");
      let isGagal = false;
      if (rawPanelNo.includes("(GAGAL)")) {
        isGagal = true;
        rawPanelNo = rawPanelNo.replace(/\(GAGAL\)/g, "").trim();
      }

      reset({
        operatorId: String(initialData.operator_id || ""),
        groupId: String(initialData.group_id || ""),
        designId: String(initialData.design_id || ""),
        nomorMc: initialData.nomor_mc || "",
        statusMatching: initialData.status_matching || "",
        tanggalProduksi:
          initialData.tgl || new Date().toISOString().split("T")[0],
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
        panelNo: rawPanelNo,
        isPanelGagal: isGagal,
        totalDowntime: String(initialData.total_downtime_detik || ""),
        jenisLaporan: isIstirahat ? "Istirahat" : "",
        downtimeEvents: parsedDowntimeEvents,
        pcsData:
          initialData.details && initialData.details.length > 0
            ? initialData.details.map((d: any, index: number) => ({
              pcsIndex: String(d.pcs_index || index + 1),
              jmlHasilProduksi: String(d.jml_hasil_produksi || "1"),
              isBs: d.kategori_masalah === "X" || Boolean(d.kategori_masalah && d.kategori_masalah.includes("BS"))
            }))
            : [
              {
                pcsIndex: "1",
                jmlHasilProduksi: "1",
              },
            ],
      });
      if (initialData.tanggal_potong) {
        setIsLastPanel(true);
      }
    }
  }, [initialData, isEdit, reset]);

  const watchGroupId = watch("groupId");
  const selectedGroup = groups.find((g) => g.id.toString() === watchGroupId);
  const activeShiftName = selectedGroup ? selectedGroup.name : "A";

  const activeOperators = operators.filter(
    (op: any) => op.shift === activeShiftName || !op.shift,
  );

  const { fields, append, remove } = useFieldArray({
    control,
    name: "pcsData",
  });

  const [pcsConfirmModal, setPcsConfirmModal] = useState<{
    isOpen: boolean;
    targetCount: number;
    actionType: "increment" | "decrement";
  }>({
    isOpen: false,
    targetCount: 0,
    actionType: "increment",
  });

  const handleChangePcsCount = (targetCount: number) => {
    if (targetCount > fields.length) {
      // Append directly without confirmation for increasing
      for (let i = fields.length; i < targetCount; i++) {
        append({
          pcsIndex: String(i + 1),
          jmlHasilProduksi: "1",
        });
      }
    } else if (targetCount < fields.length) {
      // Show confirmation dialog before reducing PCS count since it deletes data
      setPcsConfirmModal({
        isOpen: true,
        targetCount,
        actionType: "decrement",
      });
    }
  };

  // Load Draft or Header Data dari LocalStorage
  useEffect(() => {
    if (isEdit) return;

    const savedDraft = localStorage.getItem("dji_form_draft_panel");
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

    const savedHeader = localStorage.getItem("dji_form_header");
    if (savedHeader) {
      try {
        const parsed = JSON.parse(savedHeader);
        Object.keys(parsed).forEach((key) => {
          if (key === "lastRollNo") {
            const rollVal = parsed[key];
            if (rollVal) {
              const currentPcs = [
                {
                  pcsIndex: "1",
                  jmlHasilProduksi: "1",
                },
              ];
              setValue("pcsData", currentPcs);
            }
          } else {
            setValue(key as keyof ProductionFormInput, parsed[key]);
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
      localStorage.setItem("dji_form_draft_panel", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch, isEdit]);

  const watchPotonganKe = watch("potonganKe");
  const watchNomorMc = watch("nomorMc");
  // Fetch the next panelNo when potonganKe or nomorMc changes
  useEffect(() => {
    if (
      isEdit ||
      !watchPotonganKe ||
      isNaN(parseInt(watchPotonganKe)) ||
      !watchNomorMc
    ) {
      return;
    }
    const timeoutId = setTimeout(async () => {
      try {
        const res = await getLastPanelNoByPotongan(
          parseInt(watchPotonganKe),
          watchNomorMc,
        );
        if (res.success && res.nextPanelNo) {
          setValue("panelNo", res.nextPanelNo.toString());
        }
      } catch (e) { }
    }, 600);
    return () => clearTimeout(timeoutId);
  }, [watchPotonganKe, watchNomorMc, setValue, isEdit]);

  const onInvalid = (fieldErrors: any) => {
    const extractMessage = (obj: any): string | null => {
      if (!obj) return null;
      if (typeof obj === "string") return obj;
      if (obj.message && typeof obj.message === "string") return obj.message;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const msg = extractMessage(item);
          if (msg) return msg;
        }
      }
      if (typeof obj === "object") {
        for (const key of Object.keys(obj)) {
          const msg = extractMessage(obj[key]);
          if (msg) return msg;
        }
      }
      return null;
    };

    const msg = extractMessage(fieldErrors);
    setErrorMsg(msg || "Terdapat kesalahan validasi. Silakan periksa form.");
  };

  const onSubmit = async (data: ProductionFormInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);



    // Gunakan idempotency key dari ref yang stabil
    data.idempotencyKey = idempotencyKeyRef.current;

    // Otomatis set isPanelGagal jika ada PCS yang BS
    if (data.pcsData?.some((p) => p.isBs)) {
      data.isPanelGagal = true;
    }

    // Ambil nama operator asli
    data.pic = getOperatorName(data.operatorId) || "";
    data.grupName = getGroupName(data.groupId);
    data.designName = getDesignName(data.designId);
    data.created_by_name = user?.fullName || null;



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

    const isCutSubmit = !isEdit && !!data.tanggalPotong;
    const submitData: ProductionFormInput = isCutSubmit
      ? { ...data, panelNo: "" }
      : data;

    // Jika mesinMasihStop, tahan nomor panel (tidak maju)
    // Shift 2 bisa submit panel yang sama karena backend izinkan beda operator
    let nextPanelNoForSave = isCutSubmit ? "1" : nextPanelNo;
    if ((data.mesinMasihStop || data.isPanelGagal) && !isCutSubmit) {
      nextPanelNoForSave = currentPanelNo || nextPanelNo; // tetap di panel yang sama
      if (data.mesinMasihStop && data.downtimeEvents && data.downtimeEvents.length > 0) {
        const lastEvent = data.downtimeEvents[data.downtimeEvents.length - 1];
        localStorage.setItem("dji_unresolved_downtime", JSON.stringify({
          ...lastEvent,
          durasiDetik: 0 // Reset waktu, shift baru mulai hitung dari 0
        }));
      }
    } else {
      localStorage.removeItem("dji_unresolved_downtime");
    }

    if (!isEdit) {
      const headerDataToSave = {
        operatorId: data.operatorId,
        groupId: data.groupId,
        designId: data.designId,
        nomorMc: data.nomorMc,
        tanggalProduksi: data.tanggalProduksi,
        tanggalPotong: "",
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
        nextPanelNo: nextPanelNoForSave, // we store the next available panel no
      };
      localStorage.setItem("dji_form_header", JSON.stringify(headerDataToSave));
    }

    try {
      if (!navigator.onLine) {
        const { addPendingPayload } = await import("@/lib/offline-store");
        await addPendingPayload("employee", submitData);
        if (!isEdit) {
          localStorage.removeItem("dji_form_draft_panel");
        }
        setSuccessData({
          ...data,
          isOfflineSaved: true,

          isCutSubmit,
        } as any);
        return;
      }

      let result;
      if (isEdit && initialData?.id) {
        result = await updateProductionReport(initialData.id, submitData);
      } else {
        result = await createProductionReport(submitData);
      }

      if (result.success) {
        if (!isEdit) {
          localStorage.removeItem("dji_form_draft_panel");
        }
        setSuccessData({
          ...data,
          id: isEdit ? initialData.id : (result as any).productionId,
          isCutSubmit,
        } as any);
      } else {
        setErrorMsg(result.error || "Gagal menyimpan laporan produksi rajut.");
      }
    } catch (err: any) {
      if (
        err.message?.includes("fetch") ||
        err.message?.includes("Network") ||
        !navigator.onLine
      ) {
        const { addPendingPayload } = await import("@/lib/offline-store");
        await addPendingPayload("employee", submitData);
        if (!isEdit) {
          localStorage.removeItem("dji_form_draft_panel");
        }
        setSuccessData({
          ...data,
          isOfflineSaved: true,
          isCutSubmit,
        } as any);
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
      localStorage.removeItem("dji_form_header");
      localStorage.removeItem("dji_form_draft_panel");
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
        isPanelGagal: false,
        totalDowntime: "",
        pcsData: [
          {
            pcsIndex: "1",
            jmlHasilProduksi: "",
          },
        ],
      });
      setIsLastPanel(false);
      setIsHeaderModalOpen(true);
    }
  };
  const handleCloseSuccess = () => {
    if (isEdit) {
      sessionStorage.removeItem("dji_history_data");
      sessionStorage.removeItem("dji_history_searched");
      if (successData) {
        const mc = successData.nomorMc || "";
        const design = successData.designId || "";
        const potongan = successData.potonganKe || "";
        const tgl = successData.tanggalProduksi || "";
        router.push(`/history/detail?mc=${mc}&design=${design}&potongan=${potongan}&tgl=${tgl}`);
      } else {
        router.back();
      }
      return;
    }

    const wasLastPanel = !!successData?.tanggalPotong;

    setSuccessData(null);
    const savedHeader = localStorage.getItem("dji_form_header");
    let nextPanelNo = "1";
    if (savedHeader) {
      try {
        const parsed = JSON.parse(savedHeader);
        if (parsed.nextPanelNo) nextPanelNo = parsed.nextPanelNo;
      } catch (e) { }
    }
    const currentPcsData = watch("pcsData") || [];
    const newPcsData = currentPcsData.map((pcs, index) => ({
      pcsIndex: (index + 1).toString(),
      jmlHasilProduksi: "1",
    }));

    const currentPotongan = parseInt(watch("potonganKe") || "0");
    const nextPotongan =
      wasLastPanel && !isNaN(currentPotongan)
        ? String(currentPotongan + 1)
        : watch("potonganKe");

    // Jika mesinMasihStop, gunakan panelNo yang sama (dari localStorage yang sudah disimpan dengan nextPanelNo = currentPanelNo)
    // nextPanelNo dari localStorage sudah memegang nomor panel yang sama

    reset({
      ...watch(),
      potonganKe: nextPotongan,
      panelNo: nextPanelNo,
      isPanelGagal: false,
      mesinMasihStop: false,
      pcsData:
        newPcsData.length > 0
          ? newPcsData
          : [
            {
              pcsIndex: "1",
              jmlHasilProduksi: "1",
            },
          ],
      totalDowntime: "",
      tanggalPotong: "",
      downtimeEvents: [],
    });

    // Refresh idempotency key setelah sukses submit
    idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15);

    setIsLastPanel(false);

    setPreviews({ before: null, after: null });

    if (wasLastPanel) {
      setIsHeaderModalOpen(true);
      setHighlightPotonganKe(true);
    }
  };

  const currentTourStep = PANEL_TOUR_STEPS[tourStepIndex];
  const isLastTourStep = tourStepIndex === PANEL_TOUR_STEPS.length - 1;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 768;
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1024;
  const tourCardTop = tourRect
    ? Math.min(
      Math.max(tourRect.top + tourRect.height + 16, 16),
      Math.max(viewportHeight - 260, 16),
    )
    : 96;
  const tourCardLeft = tourRect
    ? Math.min(Math.max(tourRect.left, 16), Math.max(viewportWidth - 368, 16))
    : 16;

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "before" | "after",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading((prev) => ({ ...prev, [type]: true }));
      setErrorMsg(null);

      const compressedFile = await compressImage(file);
      const objectUrl = URL.createObjectURL(compressedFile);
      setPreviews((prev) => ({ ...prev, [type]: objectUrl }));

      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
      ) {
        await new Promise((r) => setTimeout(r, 1000));
        setValue(
          type === "before" ? "fotoBefore" : "fotoAfter",
          `mock_url_${type}_${Date.now()}`,
        );
        setIsUploading((prev) => ({ ...prev, [type]: false }));
        return;
      }

      const base64Data = await fileToBase64(compressedFile);
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      const uploadResult = await uploadProductionPhoto(base64Data, fileName);
      if (!uploadResult.success || !uploadResult.publicUrl) {
        throw new Error(uploadResult.error || "Gagal mengunggah foto.");
      }

      setValue(
        type === "before" ? "fotoBefore" : "fotoAfter",
        uploadResult.publicUrl,
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Gagal mengunggah foto ${type}: ${errorMessage}`);
      setPreviews((prev) => ({ ...prev, [type]: null }));
    } finally {
      setIsUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const removePhoto = (type: "before" | "after") => {
    setPreviews((prev) => ({ ...prev, [type]: null }));
    setValue(type === "before" ? "fotoBefore" : "fotoAfter", null);
  };

  const getOperatorName = (id: string) =>
    operators.find((o) => o.id.toString() === id)?.name || id;
  const getGroupName = (id: string) =>
    groups.find((g) => g.id.toString() === id)?.name || `Grup ${id}`;
  const getDesignName = (id: string) =>
    designs.find((d) => d.id.toString() === id)?.name || id;

  return (
    <div className="w-full bg-gradient-to-br from-blue-50/40 via-white to-white border border-[#e9ecef] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,112,188,0.06)] text-slate-800 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none -z-10"></div>

      <div className="relative">
        {/* Segmented Control for Mode Switching */}
        <div
          data-tour="mode-switch"
          className="flex w-full bg-slate-100/80 p-1.5 rounded-2xl mb-8 border border-slate-200/60 shadow-inner"
        >
          <div className="flex-1 flex items-center justify-center py-3.5 rounded-xl bg-white shadow-sm border border-slate-200 text-[#0070bc] relative overflow-hidden group cursor-default">
            <div className="absolute inset-0 bg-blue-50/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <div className="relative flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Box className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-black uppercase tracking-wider leading-none">
                  PANEL
                </span>
              </div>
            </div>
          </div>
          <a
            href="/input-meter"
            className="flex-1 flex items-center justify-center py-3.5 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-white/60 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold uppercase tracking-wider leading-none">
                  METER
                </span>
              </div>
            </div>
          </a>
        </div>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-100 pb-4 mb-6 gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Form Input Produksi
            </h3>
            <p className="text-xs text-slate-400 font-normal mt-1">
              Data Header akan otomatis tersimpan untuk panel berikutnya.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          <div className="bg-white border border-slate-200 shadow-sm rounded-[20px] p-3 sm:p-4 lg:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 items-start">
              {/* Kolom Kiri: Info Header & Info Panel */}
              <div className="flex flex-col gap-3 sm:gap-4 lg:gap-5">
                <div data-tour="header-summary" className="w-full">
                  <HeaderSummaryCard
                    operatorName={getOperatorName(watch("operatorId"))}
                    shiftName={activeShiftName}
                    nomorMc={watch("nomorMc") || ""}
                    design={watch("designId") || ""}
                    statusMatching={watch("statusMatching") || ""}
                    potonganKe={watch("potonganKe")}
                    pcsCount={fields.length}
                    onEdit={() => setIsHeaderModalOpen(true)}
                    showEditButton
                    showEditButtonPlacement="bottom"
                  />
                </div>

                {/* Data Panel Umum */}
                <div
                  data-tour="panel-info"
                  className="w-full mt-3.5 sm:mt-4 p-4 lg:p-5 bg-slate-50 border border-slate-200 rounded-2xl relative shadow-sm flex flex-col justify-center items-center"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-600 px-3.5 py-0.5 text-[10px] font-black text-white uppercase tracking-widest border border-white rounded-full shadow-sm whitespace-nowrap">
                    Info Panel
                  </div>

                  <div className="mt-2 flex flex-col items-center justify-center w-full">
                    <input type="hidden" {...register("panelNo")} />
                    <div className="w-full max-w-xs flex items-center justify-center pt-2">
                      <div className="h-16 sm:h-20 w-full flex items-center justify-center rounded-xl bg-white border border-slate-200 text-3xl sm:text-4xl font-extrabold text-slate-700 shadow-inner">
                        {String(watch("panelNo") || "-")}
                      </div>
                    </div>
                    {errors.panelNo && (
                      <span className="text-red-500 text-[10px] font-bold mt-2">
                        {errors.panelNo.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: Downtime Tracker */}
              <div className="flex flex-col w-full">
                <div data-tour="downtime" className="w-full">
                  <DowntimeTracker
                    control={control}
                    setValue={setValue}
                    watch={watch}
                    showBlockInput={true}
                  />
                </div>
              </div>

              <ProductionHeaderModal
                isOpen={isHeaderModalOpen}
                onClose={() => {
                  setIsHeaderModalOpen(false);
                  setHighlightPotonganKe(false);
                }}
                register={register}
                errors={errors}
                watch={watch}
                groups={groups}
                operators={activeOperators}
                activeShiftName={activeShiftName}
                onClearHeader={handleClearHeader}
                highlightPotonganKe={highlightPotonganKe}
                pcsCount={fields.length}
                onChangePcsCount={handleChangePcsCount}
              />
            </div>

            {/* Hidden PCS fields to match the array structure for form submission */}
            {fields.map((field, index) => (
              <input
                key={field.id}
                type="hidden"
                {...register(`pcsData.${index}.jmlHasilProduksi` as const)}
              />
            ))}
          </div>


          {/* Tindakan Akhir Panel Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedActions(!showAdvancedActions)}
            className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border-2 border-slate-200 border-dashed text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-slate-700 hover:border-slate-300 transition-all duration-200"
          >
            {showAdvancedActions ? (
              <>Tutup Opsi Lanjutan</>
            ) : (
              <>Buka Opsi Lanjutan (Potong / Lanjut Shift)</>
            )}
          </button>

          {/* Tindakan Akhir Panel */}
          {showAdvancedActions && (
            <div className="flex flex-col gap-3 mb-6 animate-fadeIn">
              {/* Potong Kain Toggle */}
              <div
                data-tour="cut-panel"
                className={`p-4 border rounded-2xl transition-all duration-300 ${isLastPanel ? "bg-sky-50 border-sky-300 shadow-sm" : "bg-slate-50 border-slate-200"}`}
              >
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isLastPanel}
                      onChange={(e) => {
                        setIsLastPanel(e.target.checked);
                        if (e.target.checked) {
                          setValue(
                            "tanggalPotong",
                            new Date().toISOString().split("T")[0],
                          );
                        } else {
                          setValue("tanggalPotong", "");
                        }
                      }}
                      className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                    />
                    <div>
                      <h5
                        className={`text-sm font-bold ${isLastPanel ? "text-sky-700" : "text-slate-600"}`}
                      >
                        Potong Kain
                      </h5>
                    </div>
                  </div>
                  <Scissors
                    className={`w-5 h-5 shrink-0 ${isLastPanel ? "text-sky-600" : "text-slate-400"}`}
                    style={{ transform: "scaleX(-1)" }}
                  />
                </label>

                {isLastPanel && (
                  <div className="mt-4 pt-4 border-t border-sky-200/60 animate-fadeIn">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-sky-600 uppercase">
                        Tanggal Potong
                      </label>
                      <input
                        type="date"
                        {...register("tanggalPotong")}
                        className="h-10 px-3 rounded-lg bg-white border border-sky-200 text-sm font-semibold focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Pilih PCS yang BS */}
              {fields.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 transition-all duration-300 shadow-sm">
                  <h5 className="text-xs font-black text-rose-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Tandai PCS BS
                  </h5>
                  <p className="text-[10px] font-medium text-rose-600 mb-4">
                    Centang PCS yang rusak. Jika ada 1 saja yang dicentang, nomor panel akan otomatis diulang untuk panel selanjutnya.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {fields.map((field, index) => (
                      <label key={field.id} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors shadow-sm">
                        <input
                          type="checkbox"
                          {...register(`pcsData.${index}.isBs` as const)}
                          className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-rose-700">
                          PCS {index + 1}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Lanjut Shift Checkbox */}
              {!isEdit && (
                <div className="bg-orange-50/80 border border-orange-200/60 rounded-2xl p-4 transition-all duration-300">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("mesinMasihStop")}
                      className="w-5 h-5 rounded border-orange-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-orange-800 uppercase tracking-wide">Masalah Lanjut Shift (Mesin Stop)</span>
                      <span className="text-[10px] font-medium text-orange-600/80">Centang jika masalah belum selesai dan panel dilanjutkan shift berikutnya.</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-2">
            <label htmlFor="jenisLaporanMain" className="text-xs font-bold text-slate-700 uppercase">
              Jenis Laporan / Info Istirahat
            </label>
            <select
              id="jenisLaporanMain"
              {...register("jenisLaporan")}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 focus:border-[#0070bc] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            >
              <option value="">Normal</option>
              <option value="Istirahat">Istirahat</option>
            </select>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Pilih <strong>Istirahat</strong> jika panel ini adalah hasil kerja saat Anda beristirahat (dikerjakan oleh helper).
            </p>
          </div>

          {/* Kirim Button */}
          <button
            data-tour="submit-panel"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-[#0070bc] hover:bg-[#004777] active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />{" "}
                {isEdit ? "Simpan Perubahan" : "Kirim Laporan Panel"}
              </>
            )}
          </button>
        </form>

        {isTourOpen && currentTourStep && (
          <div className="fixed inset-0 z-[70]" onClick={closeTour}>
            <div className="absolute inset-0 bg-slate-950/55" />
          </div>
        )}

        {/* Modal Sukses */}
        {successData && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
            onClick={handleCloseSuccess}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-scaleIn text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">
                {(successData as any).isOfflineSaved
                  ? "Tersimpan Offline"
                  : "Laporan Berhasil Disimpan"}
              </h4>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                {(successData as any).isCutSubmit
                  ? (successData as any).isOfflineSaved
                    ? `Data potong kain Potongan ${successData.potonganKe} antre dikirim otomatis saat sinyal pulih.`
                    : `Potong kain untuk Potongan ${successData.potonganKe} berhasil diupdate tanpa membuat baris panel baru.`
                  : (successData as any).isOfflineSaved
                    ? `Data Panel #${successData.panelNo} antre dikirim otomatis saat sinyal pulih.`
                    : `Data laporan untuk Panel #${successData.panelNo} (Potongan ${successData.potonganKe}) telah terekam.`}
              </p>
              {(successData as any).autoAdjustedDowntimeMsg && (
                <div className="w-full mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left shadow-inner">
                  <p className="text-[11px] font-bold text-amber-700 leading-snug">
                    <AlertCircle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    {(successData as any).autoAdjustedDowntimeMsg}
                  </p>
                </div>
              )}
              <button
                onClick={handleCloseSuccess}
                className="w-full py-3 bg-[#0070bc] text-white font-bold rounded-xl active:scale-95 transition-all text-sm"
              >
                {isEdit ? "Kembali ke Riwayat" : "Input Panel Berikutnya"}
              </button>
            </div>
          </div>
        )}

        {/* Modal Peringatan/Error */}
        {errorMsg && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setErrorMsg(null)}
          >
            <div
              className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-scaleIn text-center relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
              <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">Peringatan!</h4>
              <p className="text-sm font-semibold text-slate-600 mt-2 mb-6 leading-relaxed">
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-95 transition-all text-sm"
              >
                Tutup & Perbaiki
              </button>
            </div>
          </div>
        )}

        {/* Modal Konfirmasi Perubahan Jumlah PCS */}
        {pcsConfirmModal.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center animate-scaleIn text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-sky-500"></div>
              <div className="w-14 h-14 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800">
                {pcsConfirmModal.actionType === "increment"
                  ? "Tambah PCS?"
                  : "Hapus PCS?"}
              </h4>
              <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
                {pcsConfirmModal.actionType === "increment"
                  ? `Apakah Anda yakin ingin menambah jumlah PCS menjadi ${pcsConfirmModal.targetCount} pcs?`
                  : `Apakah Anda yakin ingin mengurangi jumlah PCS menjadi ${pcsConfirmModal.targetCount} pcs? Tindakan ini akan menghapus data yang berkaitan dengan PCS di atas nomor tersebut.`}
              </p>
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setPcsConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-95 transition-all text-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pcsConfirmModal.actionType === "increment") {
                      for (let i = fields.length; i < pcsConfirmModal.targetCount; i++) {
                        append({
                          pcsIndex: String(i + 1),
                          jmlHasilProduksi: "1",
                        });
                      }
                    } else {
                      for (let i = fields.length - 1; i >= pcsConfirmModal.targetCount; i--) {
                        remove(i);
                      }
                    }
                    setPcsConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl active:scale-95 transition-all text-sm"
                >
                  Ya, Ubah
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
