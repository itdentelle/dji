"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { continuousFormSchema, ContinuousFormInput } from "@/lib/schemas";
import { useAuth } from "@/lib/auth-context";
import { uploadProductionPhoto } from "@/actions/employee-actions";
import {
  submitContinuousReport,
  updateContinuousReport,
  getLastMeterStartByBatch,
  getOriginalT2ATarget,
} from "@/actions/continuous-actions";
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
  Send,
  Scissors,
} from "lucide-react";
import { useRouter } from "next/navigation";
import HeaderSummaryCard from "./HeaderSummaryCard";
import ProductionHeaderModal from "./ProductionHeaderModal";

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

const METER_TOUR_STEPS = [
  {
    target: "meter-mode-switch",
    title: "Jenis Input Meteran",
    description:
      "Mode Kontinu digunakan untuk input per roll atau meteran. Kalau hanya input per panel, pindah ke mode Panel.",
  },
  {
    target: "meter-final-report",
    title: "Laporan Meteran Akhir",
    description:
      "Gunakan tombol ini saat shift selesai atau roll sudah dipotong untuk mengisi start meter, finish meter, dan total produksi.",
  },
  {
    target: "meter-header-summary",
    title: "Data Header",
    description:
      "Cek operator, shift, mesin, design, status matching, dan potongan sebelum mengirim data meteran atau titik cacat.",
  },
  {
    target: "meter-pcs-detail",
    title: "Titik Cacat per PCS",
    description:
      "Centang jika ada cacat atau kendala, lalu pilih kategori dan minimal satu detail masalah.",
  },
  {
    target: "meter-pcs-detail",
    title: "Timer Downtime",
    description:
      "Saat kendala dicentang, timer downtime muncul. Mulai saat masalah terjadi dan stop saat mesin kembali jalan.",
  },
  {
    target: "meter-cut-roll",
    title: "Potong Kain",
    description:
      "Centang ini hanya untuk potongan terakhir dalam roll, lalu lanjut isi total produksi meteran.",
  },
  {
    target: "meter-submit-defect",
    title: "Kirim Titik Cacat",
    description:
      "Gunakan tombol ini untuk mengirim laporan titik cacat tanpa mengisi laporan meteran akhir.",
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

type ContinuousFormProps = {
  initialData?: any;
  isEdit?: boolean;
};

function parseFormMeterValue(value: string | null | undefined): number | null {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const num = parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
}

function getJakartaDateString() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function ContinuousForm({
  initialData,
  isEdit,
}: ContinuousFormProps = {}) {
  const { user } = useAuth();
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<
    (ContinuousFormInput & { id?: string }) | null
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourRect, setTourRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const router = useRouter();

  // States untuk dynamic dropdown dari Supabase
  const [operators, setOperators] = useState(FALLBACK_OPERATORS);
  const [designs, setDesigns] = useState(FALLBACK_DESIGNS);
  const [groups, setGroups] = useState(FALLBACK_GROUPS);

  // Accordion UI State
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [highlightPotonganKe, setHighlightPotonganKe] = useState(false);

  // Pop-up Modal State
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);
  const [isLastRoll, setIsLastRoll] = useState(false);

  // States untuk upload foto
  const [isUploading, setIsUploading] = useState<{
    before: boolean;
    after: boolean;
  }>({ before: false, after: false });
  const [previews, setPreviews] = useState<{
    before: string | null;
    after: string | null;
  }>({ before: null, after: null });
  const [isMeterAwalLocked, setIsMeterAwalLocked] = useState(true);
  const [originalT2ATarget, setOriginalT2ATarget] = useState<number | null>(
    null,
  );

  // Timer State for Downtime
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerStartRef, setTimerStartRef] = useState<number | null>(null);
  const [timerStopRef, setTimerStopRef] = useState<number | null>(null);
  const [firstProblemTime, setFirstProblemTime] = useState<number | null>(null);
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

  useEffect(() => {
    const startMeterTour = () => {
      if (isEdit) return;
      setTourStepIndex(0);
      setIsMeterModalOpen(false);
      setIsTourOpen(true);
    };

    window.addEventListener("dji:start-meter-tour", startMeterTour);
    return () =>
      window.removeEventListener("dji:start-meter-tour", startMeterTour);
  }, [isEdit]);

  useEffect(() => {
    if (!isTourOpen) return;

    const currentStep = METER_TOUR_STEPS[tourStepIndex];
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

  const handleStartTimer = () => {
    setIsTimerRunning(true);
    const now = Date.now();
    setTimerStartRef(now);
    if (!firstProblemTime) {
      setFirstProblemTime(now);
    }
    setLiveTimerSeconds(0);
  };

  const handleStopTimer = () => {
    if (!isTimerRunning) return;
    setIsTimerRunning(false);

    const now = Date.now();

    // Calculate elapsed seconds
    const elapsedMs = now - (timerStartRef || now);
    const elapsedSecs = Math.ceil(elapsedMs / 1000);

    const currentTotalStr = watch("totalDowntime");
    const currentTotal = parseInt(currentTotalStr || "0") || 0;

    const newTotal = currentTotal + elapsedSecs;
    setValue("totalDowntime", String(newTotal), {
      shouldValidate: true,
      shouldDirty: true,
    });

    setTimerStartRef(null);
    setTimerStopRef(now);
    setLiveTimerSeconds(0);
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
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
    trigger,
    formState: { errors },
  } = useForm<ContinuousFormInput>({
    resolver: zodResolver(continuousFormSchema),
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
      totalDowntime: "",
      meterAwal: "",
      meterAkhir: "",
      hasilProduksiMeter: "",
      targetMeter: "",
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
        },
      ],
    },
  });

  useEffect(() => {
    if (initialData && isEdit) {
      reset({
        operatorId: String(initialData.operator_id || ""),
        groupId: String(initialData.group_id || ""),
        designId: String(initialData.design_id || ""),
        nomorMc: initialData.nomor_mc || "",
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
        totalDowntime: String(initialData.total_downtime_detik || ""),
        meterAwal: String(initialData.meter_awal || ""),
        meterAkhir: String(initialData.meter_akhir || ""),
        hasilProduksiMeter: String(initialData.total_produksi_meter || ""),
        targetMeter: initialData.target_meter
          ? String(initialData.target_meter)
          : "",
        pcsData:
          initialData.details && initialData.details.length > 0
            ? initialData.details.map((d: any) => ({
                pcsIndex: String(d.pcs_index || "1"),
                jmlHasilProduksi: "0",
                meterKain: d.meter_kain || "",
                indikatorStop: d.kategori_masalah ? true : false,
                kategoriMasalah: d.kategori_masalah
                  ? d.kategori_masalah.split(", ")
                  : [],
                detailMasalah: d.detail_masalah || "",
                keteranganCacat: d.keterangan_cacat || "",
                rollNo: d.roll_no || "",
              }))
            : [
                {
                  pcsIndex: "1",
                  jmlHasilProduksi: "0",
                  meterKain: "",
                  indikatorStop: false,
                  kategoriMasalah: [],
                  detailMasalah: "",
                  keteranganCacat: "",
                  rollNo: "",
                },
              ],
      });
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

  // Auto calculate total hasil produksi meter
  const watchMeterAwal = watch("meterAwal");
  const watchMeterAkhir = watch("meterAkhir");
  const watchNomorMc = watch("nomorMc");
  const watchPotonganKe = watch("potonganKe");

  useEffect(() => {
    if (watchMeterAwal && watchMeterAkhir) {
      const awal = parseFloat(watchMeterAwal);
      const akhir = parseFloat(watchMeterAkhir);
      if (!isNaN(awal) && !isNaN(akhir)) {
        if (watchNomorMc === "T2A") {
          setValue("hasilProduksiMeter", String(Math.max(awal - akhir, 0)));
        } else {
          setValue("hasilProduksiMeter", String(Math.max(akhir - awal, 0)));
        }
      }
    } else if (!watchMeterAkhir) {
      setValue("hasilProduksiMeter", "");
    }
  }, [watchMeterAwal, watchMeterAkhir, watchNomorMc, setValue]);

  const refreshAutomaticMeterStart = async () => {
    if (isEdit) return;

    const nomorMc = getValues("nomorMc");
    const potonganKe = getValues("potonganKe");
    if (!nomorMc || !potonganKe) {
      setValue("meterAwal", "");
      return;
    }

    const result = await getLastMeterStartByBatch({
      nomorMc,
      potonganKe,
    });

    const nextMeterStart = result.success
      ? String(result.meterStart ?? 0)
      : "0";

    const nextMeterStartNum = result.success ? (result.meterStart ?? 0) : 0;
    const nomorMcStr = getValues("nomorMc");

    if (nomorMcStr === "T2A") {
      if (nextMeterStartNum > 0) {
        // Continuing same roll from previous shift — lock with previous remaining
        setValue("meterAwal", String(nextMeterStartNum), {
          shouldDirty: false,
          shouldValidate: Boolean(getValues("meterAkhir")),
        });
        setIsMeterAwalLocked(true);
        // Fetch original target for display
        getOriginalT2ATarget({
          nomorMc: nomorMcStr,
          potonganKe: getValues("potonganKe"),
        }).then((res) => {
          if (res.success && res.originalTarget)
            setOriginalT2ATarget(res.originalTarget);
        });
      } else {
        // New roll or after cut — let user type target
        setIsMeterAwalLocked(false);
        setOriginalT2ATarget(null);
      }
    } else {
      setValue("meterAwal", nextMeterStart, {
        shouldDirty: false,
        shouldValidate: Boolean(getValues("meterAkhir")),
      });
      setIsMeterAwalLocked(true);
    }
  };

  useEffect(() => {
    if (isEdit) return;

    if (!watchNomorMc || !watchPotonganKe || isNaN(parseInt(watchPotonganKe))) {
      return;
    }

    let isActive = true;
    const timeoutId = setTimeout(async () => {
      if (!isActive) return;

      // Skip logic for T2A if it's a new roll, handled below

      const result = await getLastMeterStartByBatch({
        nomorMc: watchNomorMc,
        potonganKe: watchPotonganKe,
      });

      if (!isActive) return;
      const nextMeterStartNum = result.success ? (result.meterStart ?? 0) : 0;
      const nextMeterStartStr = String(nextMeterStartNum);

      if (watchNomorMc === "T2A") {
        if (nextMeterStartNum > 0) {
          setValue("meterAwal", nextMeterStartStr, {
            shouldDirty: false,
            shouldValidate: Boolean(watchMeterAkhir),
          });
          setIsMeterAwalLocked(true);
          // Fetch original target for display
          getOriginalT2ATarget({
            nomorMc: watchNomorMc,
            potonganKe: watchPotonganKe,
          }).then((res) => {
            if (isActive && res.success && res.originalTarget)
              setOriginalT2ATarget(res.originalTarget);
          });
        } else {
          setIsMeterAwalLocked(false);
          setOriginalT2ATarget(null);
          // If the user hasn't typed anything yet, ensure it's empty
          if (!watchMeterAwal) {
            setValue("meterAwal", "", { shouldDirty: false });
          }
        }
      } else {
        setValue("meterAwal", nextMeterStartStr, {
          shouldDirty: false,
          shouldValidate: Boolean(watchMeterAkhir),
        });
        setIsMeterAwalLocked(true);
      }
    }, 600); // Add 600ms delay mirip getLastPanelNoByPotongan

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [isEdit, watchMeterAkhir, watchNomorMc, watchPotonganKe, setValue]);

  // Load Draft or Header Data dari LocalStorage
  useEffect(() => {
    if (isEdit) return;

    const savedDraft = localStorage.getItem("dji_form_draft_continuous");
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
                  meterKain: "",
                  indikatorStop: false,
                  kategoriMasalah: [],
                  detailMasalah: "",
                  keteranganCacat: "",
                  rollNo: rollVal,
                },
              ];
              setValue("pcsData", currentPcs);
            }
          } else if (key === "tanggalPotong") {
            // Hindari tanggal potong lama terbawa ke submit berikutnya.
            setValue("tanggalPotong", "");
          } else if (key === "meterAwal") {
            // Jangan set meterAwal di sini - biarkan watchNomorMc/potonganKe effect fetch dari database
            // Ini memastikan selalu ambil nilai terbaru dari database sesuai dengan mesin dan potongan
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
      localStorage.setItem("dji_form_draft_continuous", JSON.stringify(value));
    });
    return () => subscription.unsubscribe();
  }, [watch, isEdit]);

  // Handler for form validation failures — extracts readable error messages
  const onInvalid = (fieldErrors: any) => {
    // Extract the first error message from nested errors
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

  const onSubmit = async (data: ContinuousFormInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    let adjustedMsg = "";
    if (timerStopRef && firstProblemTime) {
      const now = Date.now();
      const gapSeconds = (now - timerStopRef) / 1000;
      if (gapSeconds > 20) {
        const actualDowntime = Math.ceil((now - firstProblemTime) / 1000);
        const oldDowntime = data.totalDowntime || "0";
        data.totalDowntime = String(actualDowntime);
        setValue("totalDowntime", String(actualDowntime), {
          shouldValidate: true,
          shouldDirty: true,
        });
        adjustedMsg = `Waktu downtime otomatis disesuaikan dari ${oldDowntime} detik menjadi ${actualDowntime} detik karena jeda pengiriman form lebih dari 20 detik.`;
      }
    }

    // Gunakan idempotency key dari ref yang stabil
    data.idempotencyKey = idempotencyKeyRef.current;

    // Ambil nama operator dan simpan ke PIC (dari auth context)
    data.pic = user?.fullName || "";
    data.operatorId = "AUTO";
    data.grupName = getGroupName(data.groupId);
    data.designName = getDesignName(data.designId);
    data.created_by_name = user?.fullName || null;

    const meterAkhirNum = parseFormMeterValue(data.meterAkhir);
    const isT2ACutSubmit = data.nomorMc === "T2A" && meterAkhirNum === 0;
    const effectiveIsLastRoll = isLastRoll || isT2ACutSubmit;

    if (isT2ACutSubmit) {
      setIsLastRoll(true);
    }

    const effectiveTanggalPotong = effectiveIsLastRoll
      ? data.tanggalPotong || getJakartaDateString()
      : "";
    data.tanggalPotong = effectiveTanggalPotong;

    // T2A: meterAwal = Target, meterAkhir = Counter reading, total calculated on backend
    const isT2A = data.nomorMc === "T2A";
    if (isT2A && !isT2ACutSubmit) {
      if (
        !data.meterAwal ||
        data.meterAwal.toString().trim() === "" ||
        data.meterAwal === "0"
      ) {
        setErrorMsg(
          "Untuk mesin T2A, masukkan Target Produksi terlebih dahulu.",
        );
        setIsSubmitting(false);
        return;
      }
    }

    // Gabungkan detailMasalahMap ke spesifikMasalah, dan set detailMasalah ke nama kategori lengkap
    if (data.pcsData) {
      data.pcsData.forEach((pcs) => {
        if (pcs.indikatorStop && pcs.kategoriMasalah && pcs.detailMasalahMap) {
          const detailNames = pcs.kategoriMasalah
            .map(
              (cat) =>
                NEW_PROBLEM_CATEGORIES.find((c) => c.id === cat)?.name || cat,
            )
            .join(", ");

          const combinedSpesifik = pcs.kategoriMasalah
            .map((cat) => {
              const details = pcs.detailMasalahMap?.[cat];
              return Array.isArray(details) ? details.join(", ") : details;
            })
            .filter(Boolean)
            .join(", ");

          pcs.detailMasalah = detailNames || null;
          pcs.spesifikMasalah = combinedSpesifik || null;
        }
      });
    }

    // Save Header Data to LocalStorage automatically on submit
    const lastRollNo =
      data.pcsData && data.pcsData.length > 0 ? data.pcsData[0].rollNo : "";

    const headerDataToSave = {
      operatorId: data.operatorId,
      groupId: data.groupId,
      designId: data.designId,
      nomorMc: data.nomorMc,
      tanggalProduksi: data.tanggalProduksi,
      tanggalPotong: effectiveTanggalPotong,
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
      meterAwal:
        data.meterAkhir && !effectiveIsLastRoll
          ? data.meterAkhir
          : effectiveIsLastRoll
            ? ""
            : data.meterAwal,
      meterAkhir: "",
      hasilProduksiMeter: "",
      lastRollNo: lastRollNo,
    };
    localStorage.setItem("dji_form_header", JSON.stringify(headerDataToSave));

    try {
      if (!navigator.onLine) {
        const { addPendingPayload } = await import("@/lib/offline-store");
        await addPendingPayload("continuous", data);
        localStorage.removeItem("dji_form_draft_continuous");
        setSuccessData({
          ...data,
          isOfflineSaved: true,
          autoAdjustedDowntimeMsg: adjustedMsg,
          isCutSubmit: isT2ACutSubmit,
        } as any);
        return;
      }

      let result;
      if (isEdit && initialData?.id) {
        result = await updateContinuousReport(initialData.id, data);
      } else {
        result = await submitContinuousReport(data);
      }

      if (result.success) {
        localStorage.removeItem("dji_form_draft_continuous");
        setSuccessData({
          ...data,
          id: isEdit ? initialData.id : (result as any).productionId,
          autoAdjustedDowntimeMsg: adjustedMsg,
          isCutSubmit: isT2ACutSubmit,
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
        await addPendingPayload("continuous", data);
        localStorage.removeItem("dji_form_draft_continuous");
        setSuccessData({
          ...data,
          isOfflineSaved: true,
          autoAdjustedDowntimeMsg: adjustedMsg,
          isCutSubmit: isT2ACutSubmit,
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
      localStorage.removeItem("dji_form_draft_continuous");
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
        pcsData: [
          {
            pcsIndex: "1",
            jmlHasilProduksi: "",
            indikatorStop: false,
            kategoriMasalah: [],
            detailMasalah: "",
            keteranganCacat: "",
          },
        ],
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
    const wasLastRoll = isLastRoll;
    setSuccessData(null);
    const savedHeader = localStorage.getItem("dji_form_header");
    let nextPanelNo = "1";
    if (savedHeader) {
      try {
        const parsed = JSON.parse(savedHeader);
        if (parsed.nextPanelNo) nextPanelNo = parsed.nextPanelNo;
      } catch (e) {}
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

    const currentPotongan = parseInt(watch("potonganKe") || "0", 10);
    const nextPotongan =
      wasLastRoll && !isNaN(currentPotongan)
        ? String(currentPotongan + 1)
        : watch("potonganKe");

    reset({
      ...watch(),
      potonganKe: nextPotongan,

      pcsData:
        newPcsData.length > 0
          ? newPcsData
          : [
              {
                pcsIndex: "1",
                jmlHasilProduksi: "1",
                meterKain: "",
                rollNo: "",
                indikatorStop: false,
                kategoriMasalah: [],
                detailMasalah: "",
                keteranganCacat: "",
              },
            ],
      totalDowntime: "",
      meterAwal: wasLastRoll ? "" : watch("meterAwal"),
      meterAkhir: "",
      hasilProduksiMeter: "",
      tanggalPotong: "",
      targetMeter: wasLastRoll ? "" : watch("targetMeter"),
    });

    // Refresh idempotency key setelah sukses submit
    idempotencyKeyRef.current = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 15);

    setIsLastRoll(false);
    setIsTimerRunning(false);
    setTimerStartRef(null);
    setTimerStopRef(null);
    setFirstProblemTime(null);
    setLiveTimerSeconds(0);
    setPreviews({ before: null, after: null });

    if (wasLastRoll) {
      setIsHeaderModalOpen(true);
      setHighlightPotonganKe(true);
    }
  };

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

  const currentTourStep = METER_TOUR_STEPS[tourStepIndex];
  const isLastTourStep = tourStepIndex === METER_TOUR_STEPS.length - 1;
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

  return (
    <div className="w-full bg-gradient-to-br from-emerald-50/40 via-white to-white border border-[#e9ecef] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(16,185,129,0.06)] text-slate-800 relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none z-0"></div>

      <div className="relative z-10">
        {/* Segmented Control for Mode Switching */}
        <div
          data-tour="meter-mode-switch"
          className="flex w-full bg-slate-100/80 p-1.5 rounded-2xl mb-8 border border-slate-200/60 shadow-inner"
        >
          <a
            href="/input"
            className="flex-1 flex items-center justify-center py-3.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white/60 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                <Box className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-black uppercase tracking-wider leading-none">
                  PANEL
                </span>
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
                <span className="text-sm font-black uppercase tracking-wider leading-none">
                  METER
                </span>
              </div>
            </div>
          </div>
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

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50/50 border border-red-100 text-red-700 rounded-xl flex items-start gap-2.5 text-xs font-semibold animate-fadeIn">
            <AlertCircle
              className="w-4 h-4 shrink-0 text-red-500"
              strokeWidth={2}
            />
            <span>{errorMsg}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="space-y-4"
        >
          <div className="bg-white border border-slate-200 shadow-sm rounded-[20px] p-3 sm:p-4 lg:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-[3fr_2fr] gap-3 sm:gap-4 lg:gap-5 items-stretch">
              <div data-tour="meter-header-summary" className="w-full">
                <HeaderSummaryCard
                  operatorName={user?.fullName || ""}
                  shiftName={activeShiftName}
                  nomorMc={watch("nomorMc") || ""}
                  design={watch("designId") || ""}
                  statusMatching={watch("statusMatching") || ""}
                  potonganKe={watch("potonganKe")}
                  onEdit={() => {
                    setIsHeaderModalOpen(true);
                    setHighlightPotonganKe(false);
                  }}
                  showEditButton
                  showEditButtonPlacement="bottom"
                />
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
              />

              {/* Tombol Pemicu Pop-up Meteran */}
              <div
                data-tour="meter-final-report"
                className="w-full min-h-full p-3 sm:p-4 lg:p-6 bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl relative shadow-md flex flex-col justify-center"
              >
                <div className="absolute -top-3.5 lg:-top-4 left-1/2 -translate-x-1/2 bg-emerald-600 px-3 lg:px-5 py-1 lg:py-1.5 text-[9px] lg:text-[11px] font-black text-white uppercase tracking-widest border-2 border-white rounded-full shadow-md whitespace-nowrap">
                  {watch("nomorMc") === "T2A"
                    ? "Laporan Meter"
                    : "Laporan Hasil Akhir"}
                </div>

                <div className="mt-3 flex flex-col items-center justify-center text-center gap-4">
                  <div>
                    <h4 className="text-sm sm:text-base lg:text-lg font-black text-emerald-900">
                      {watch("nomorMc") === "T2A"
                        ? "Laporan Meter"
                        : "Laporan Hasil Akhir (Shift / Roll)"}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-emerald-700 mt-1 sm:mt-2 max-w-sm mx-auto">
                      {watch("nomorMc") === "T2A"
                        ? "Gunakan tombol di bawah untuk melaporkan meter produksi."
                        : "Gunakan tombol di bawah jika gulungan telah dipotong atau shift selesai."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMeterModalOpen(true)}
                    className="w-full max-w-xs px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2.5"
                  >
                    <FileText className="w-5 h-5" />
                    {watch("nomorMc") === "T2A"
                      ? "Lapor Meter"
                      : "Lapor Meteran Akhir"}
                  </button>
                </div>
              </div>
            </div>

            {/* ARRAY OF PCS */}
            <div data-tour="meter-pcs-detail" className="mt-8">
              <div className="text-center mb-6">
                <h4 className="text-sm font-bold text-slate-700">
                  Detail per PCS
                </h4>
              </div>

              <div className="space-y-6">
                {fields.map((field, index) => {
                  const watchIndikator = watch(
                    `pcsData.${index}.indikatorStop` as any,
                  );
                  return (
                    <div
                      key={field.id}
                      className="border-t-2 border-slate-200/60 relative pt-6 pb-2"
                    >
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
                        <input
                          type="hidden"
                          {...register(
                            `pcsData.${index}.jmlHasilProduksi` as const,
                          )}
                        />
                        <div className="flex flex-col gap-1 w-full">
                          <label className="text-[10px] font-semibold text-slate-500 uppercase">
                            Posisi Meter Kain
                          </label>
                          <input
                            type="text"
                            {...register(`pcsData.${index}.meterKain` as const)}
                            className="h-11 px-4 rounded-xl bg-white border border-slate-300 text-sm focus:border-sky-400 outline-none transition-all shadow-sm"
                            placeholder="Contoh: 15.5"
                          />
                          {errors.pcsData?.[index]?.meterKain && (
                            <span className="text-red-500 text-[10px] font-bold">
                              {errors.pcsData[index]?.meterKain?.message}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`mt-4 border rounded-xl overflow-hidden transition-all duration-300 ${watchIndikator ? "border-red-200 bg-red-50/20" : "border-slate-200 bg-slate-50/50"}`}
                      >
                        <label className="flex items-center justify-between p-4 cursor-pointer select-none">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              {...register(
                                `pcsData.${index}.indikatorStop` as const,
                              )}
                              onChange={(e) => {
                                register(
                                  `pcsData.${index}.indikatorStop` as const,
                                ).onChange(e);
                                if (e.target.checked) {
                                  if (!isTimerRunning) handleStartTimer();
                                } else {
                                  setTimeout(() => {
                                    const currentPcsData =
                                      getValues("pcsData") || [];
                                    if (
                                      !currentPcsData.some(
                                        (p) => p.indikatorStop,
                                      )
                                    ) {
                                      setIsTimerRunning(false);
                                      setTimerStartRef(null);
                                      setTimerStopRef(null);
                                      setFirstProblemTime(null);
                                      setLiveTimerSeconds(0);
                                      setValue("totalDowntime", "");
                                    }
                                  }, 10);
                                }
                              }}
                              className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-slate-300 cursor-pointer"
                            />
                            <div>
                              <h5
                                className={`text-sm font-bold ${watchIndikator ? "text-red-650" : "text-slate-600"}`}
                              >
                                Terdapat Cacat / Kendala pada PCS ini?
                              </h5>
                            </div>
                          </div>
                        </label>

                        {watchIndikator && (
                          <div className="p-4 border-t border-red-100/50 space-y-4 animate-fadeIn">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-red-600 uppercase">
                                Kategori Masalah (Pilih lebih dari 1)
                              </label>
                              <div className="flex flex-col gap-2 mt-1">
                                {NEW_PROBLEM_CATEGORIES.map((c) => {
                                  const isChecked = watch(
                                    `pcsData.${index}.kategoriMasalah`,
                                  )?.includes(c.id);
                                  return (
                                    <div
                                      key={c.id}
                                      className="flex flex-col gap-2 p-3 bg-white border border-red-100 rounded-lg shadow-sm"
                                    >
                                      <label className="flex items-center gap-2 cursor-pointer hover:text-red-500 transition-colors">
                                        <input
                                          type="checkbox"
                                          value={c.id}
                                          {...register(
                                            `pcsData.${index}.kategoriMasalah` as const,
                                          )}
                                          className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500"
                                        />
                                        <span className="text-xs font-bold text-slate-700">
                                          {c.name}
                                        </span>
                                      </label>

                                      {isChecked && (
                                        <div className="pl-6 animate-fadeIn mt-2">
                                          <div className="w-full rounded-md bg-white border border-red-200 overflow-hidden flex flex-col shadow-inner">
                                            <div className="px-3 py-1.5 bg-slate-50 border-b border-red-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                              Pilih Detail Masalah
                                            </div>
                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                              {NEW_PROBLEMS[c.id]?.map((p) => {
                                                const currentSelections =
                                                  watch(
                                                    `pcsData.${index}.detailMasalahMap.${c.id}`,
                                                  ) || [];
                                                const isSelected =
                                                  Array.isArray(
                                                    currentSelections,
                                                  )
                                                    ? currentSelections.includes(
                                                        p,
                                                      )
                                                    : currentSelections === p;
                                                return (
                                                  <label
                                                    key={p}
                                                    className={`px-3 py-2 cursor-pointer text-xs transition-colors border-b last:border-0 border-slate-100 flex items-center justify-between ${
                                                      isSelected
                                                        ? "bg-red-50 text-red-700 font-bold"
                                                        : "hover:bg-slate-50 text-slate-600"
                                                    }`}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      value={p}
                                                      {...register(
                                                        `pcsData.${index}.detailMasalahMap.${c.id}` as const,
                                                      )}
                                                      className="hidden"
                                                    />
                                                    <span>{p}</span>
                                                    {isSelected && (
                                                      <CheckCircle2 className="w-4 h-4 text-red-500 shrink-0 ml-2" />
                                                    )}
                                                  </label>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          {errors.pcsData?.[index]
                                            ?.detailMasalahMap?.[c.id] && (
                                            <span className="text-red-500 text-[10px] font-bold mt-1 block">
                                              {
                                                errors.pcsData[index]
                                                  ?.detailMasalahMap?.[c.id]
                                                  ?.message
                                              }
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              {errors.pcsData?.[index]?.kategoriMasalah && (
                                <span className="text-red-500 text-[10px] font-bold mt-1 block">
                                  {
                                    errors.pcsData[index]?.kategoriMasalah
                                      ?.message
                                  }
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
                    <p className="text-sm text-slate-400 font-medium">
                      Belum ada PCS yang dicatat.
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() =>
                    append({
                      pcsIndex: String(fields.length + 1),
                      jmlHasilProduksi: "0",
                      meterKain: "",
                      indikatorStop: false, // Default is not a defect
                      kategoriMasalah: [],
                      detailMasalah: "",
                      keteranganCacat: "",
                    })
                  }
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
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 text-[10px] font-bold uppercase">
                      Detik
                    </span>
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
              <p className="text-xs font-bold text-red-600">
                {(errors.pcsData as any)?.message}
              </p>
            </div>
          )}
          {(errors.pcsData as any)?.root?.message && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-xs font-bold text-red-600">
                {(errors.pcsData as any)?.root?.message}
              </p>
            </div>
          )}

          {/* Potong Kain Toggle */}
          <div
            data-tour="meter-cut-roll"
            className={`p-5 border rounded-2xl transition-all duration-300 mb-6 ${isLastRoll ? "bg-emerald-50 border-emerald-300 shadow-sm" : "bg-slate-50 border-slate-200"}`}
          >
            <label className="flex items-center justify-between cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isLastRoll}
                  onChange={(e) => {
                    setIsLastRoll(e.target.checked);
                    if (e.target.checked) {
                      setValue(
                        "tanggalPotong",
                        new Date().toISOString().split("T")[0],
                      );
                    } else {
                      setValue("tanggalPotong", "");
                    }
                  }}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <div>
                  <h5
                    className={`text-sm font-bold ${isLastRoll ? "text-emerald-700" : "text-slate-600"}`}
                  >
                    Potong Kain
                  </h5>
                </div>
              </div>
              <Scissors
                className={`w-5 h-5 shrink-0 scale-x-[-1] ${isLastRoll ? "text-emerald-600" : "text-slate-400"}`}
              />
            </label>

            {isLastRoll && (
              <div className="mt-4 pt-4 border-t border-emerald-200/60 animate-fadeIn">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] font-bold text-emerald-600 uppercase">
                      Tanggal Potong
                    </label>
                    <input
                      type="date"
                      {...register("tanggalPotong")}
                      className="h-12 px-4 rounded-xl bg-white border border-emerald-200 text-sm font-semibold focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none shadow-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await refreshAutomaticMeterStart();
                      setIsMeterModalOpen(true);
                    }}
                    className="flex-[2] h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-sm md:text-base font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Save className="w-5 h-5" /> Lanjut Isi Total Produksi
                    (Meteran)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Buttons Action */}
          <div className="flex flex-col gap-4 mt-6">
            {/* Kirim Laporan Cacat Button */}
            <button
              data-tour="meter-submit-defect"
              type="button"
              onClick={() => {
                // Karena ini tombol kirim form cacat, kosongkan meterAkhir agar validasi skema tetap masuk akal
                if (watch("nomorMc") !== "T2A") {
                  setValue("meterAwal", "");
                }
                setValue("meterAkhir", "");
                handleSubmit(onSubmit, onInvalid)();
              }}
              disabled={isSubmitting}
              className={`w-full h-12 rounded-xl active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${isLastRoll ? "bg-slate-400 hover:bg-slate-500" : "bg-[#0070bc] hover:bg-[#004777]"}`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />{" "}
                  {isEdit
                    ? "Simpan Perubahan Cacat"
                    : "Kirim Laporan Titik Cacat"}
                </>
              )}
            </button>
          </div>

          {/* Modal Pop-up Meteran */}
          {isMeterModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
              onClick={() => setIsMeterModalOpen(false)}
            >
              <div
                data-tour="meter-modal"
                className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col animate-scaleIn relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Background accent */}
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-10"></div>

                <div className="flex justify-between items-center mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">
                        Laporan Meteran
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Isi di akhir shift atau potong roll
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMeterModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  {/* T2A: target-first flow */}
                  {watch("nomorMc") === "T2A" ? (
                    <div className="space-y-3">
                      {/* Info Target Produksi Awal (saat lanjutan shift) */}
                      {isMeterAwalLocked && originalT2ATarget !== null && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-blue-800 uppercase">
                              Target Produksi Awal
                            </p>
                            <p className="text-base font-black text-blue-700">
                              {originalT2ATarget} m
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          {isMeterAwalLocked
                            ? "Start Meter"
                            : "Target Produksi (meter)"}
                        </label>
                        <input
                          type="number"
                          step="any"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          {...register("meterAwal")}
                          readOnly={isMeterAwalLocked}
                          className={`h-12 px-4 rounded-xl border text-base font-semibold outline-none transition-all ${
                            isMeterAwalLocked
                              ? "bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed"
                              : "bg-white border-slate-200 focus:border-emerald-400"
                          }`}
                          placeholder="Contoh: 600"
                        />
                        {isMeterAwalLocked && (
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                            Dilanjutkan dari sisa meter shift sebelumnya.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Finish Meter (Counter Mesin)
                        </label>
                        <input
                          type="number"
                          step="any"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          {...register("meterAkhir")}
                          className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-base font-semibold focus:border-emerald-400 outline-none transition-all text-right"
                          placeholder="Masukkan angka di mesin saat ini"
                        />
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <label className="text-[10px] font-bold text-emerald-800 uppercase flex justify-between items-center mb-1">
                          <span>Total Produksi</span>
                        </label>
                        <div className="text-right text-lg font-black text-emerald-700">
                          {(() => {
                            const akhirStr = watch("meterAkhir");
                            if (!akhirStr || akhirStr.trim() === "")
                              return "0 m";
                            const t =
                              parseFloat(watch("meterAwal") || "0") || 0;
                            const p = parseFloat(akhirStr) || 0;
                            const rem = Math.max(t - p, 0);
                            return `${rem} m`;
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Start Meter Otomatis
                        </label>
                        <input
                          type="number"
                          step="any"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          {...register("meterAwal")}
                          readOnly
                          className="h-12 px-4 rounded-xl bg-slate-100 border border-slate-200 text-base font-semibold text-slate-700 outline-none transition-all cursor-not-allowed"
                          placeholder="Otomatis dari finish terakhir"
                        />
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          Potongan baru mulai dari 0. Jika shift sebelumnya
                          belum potong kain, nilai ini mengikuti finish meter
                          terakhir.
                        </p>
                        {errors.meterAwal && (
                          <span className="text-red-500 text-[10px] font-bold mt-0.5">
                            {errors.meterAwal.message}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">
                          Finish Meter
                        </label>
                        <input
                          type="number"
                          step="any"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          {...register("meterAkhir")}
                          className="h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-base font-semibold focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                          placeholder="Contoh: 250"
                        />
                        {errors.meterAkhir && (
                          <span className="text-red-500 text-[10px] font-bold mt-0.5">
                            {errors.meterAkhir.message}
                          </span>
                        )}
                      </div>

                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mt-2">
                        <label className="text-[10px] font-bold text-emerald-800 uppercase flex justify-between items-center mb-1">
                          <span>Total Hasil Produksi</span>
                          <span className="text-[9px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-black uppercase">
                            Auto Calculate
                          </span>
                        </label>
                        <input
                          type="number"
                          step="any"
                          onWheel={(e) => (e.target as HTMLElement).blur()}
                          {...register("hasilProduksiMeter")}
                          className="w-full h-12 px-4 rounded-xl bg-white border border-emerald-300 text-lg font-black text-emerald-700 focus:border-emerald-500 outline-none shadow-sm text-right"
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3 mt-8 relative z-10">
                  {/* T2A potongan baru: Simpan (blue) + Kirim (green) sejajar */}
                  {watch("nomorMc") === "T2A" && !isMeterAwalLocked ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const target = watch("meterAwal");
                          if (
                            !target ||
                            target.trim() === "" ||
                            target === "0"
                          ) {
                            setErrorMsg(
                              "Masukkan Target Produksi terlebih dahulu.",
                            );
                            return;
                          }
                          localStorage.setItem(
                            "dji_form_draft_continuous",
                            JSON.stringify(watch()),
                          );
                          setIsMeterModalOpen(false);
                          setErrorMsg(null);
                          setSuccessData({ isTargetSaved: true } as any);
                        }}
                        className="flex-1 py-3.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex justify-center items-center gap-2 text-sm"
                      >
                        <Save className="w-4 h-4" />
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await refreshAutomaticMeterStart();
                          const isValid = await trigger([
                            "meterAwal",
                            "meterAkhir",
                          ]);
                          if (!isValid) return;

                          const currentMc = watch("nomorMc");
                          const currentMeterAkhir = parseFloat(
                            watch("meterAkhir") || "0",
                          );
                          if (currentMc === "T2A" && currentMeterAkhir === 0) {
                            setIsLastRoll(true);
                            setValue(
                              "tanggalPotong",
                              getJakartaDateString(),
                            );
                          }

                          const currentPcs = watch("pcsData") || [];
                          const cleanPcs = currentPcs.map((pcs) => ({
                            ...pcs,
                            indikatorStop: false,
                            kategoriMasalah: [],
                            detailMasalahMap: undefined,
                            detailMasalah: "",
                            spesifikMasalah: "",
                            keteranganCacat: "",
                          }));
                          setValue("pcsData", cleanPcs);
                          setValue("totalDowntime", "");

                          setIsMeterModalOpen(false);
                          handleSubmit(onSubmit, onInvalid)();
                        }}
                        disabled={isSubmitting}
                        className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex justify-center items-center gap-2 text-sm"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Kirim
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsMeterModalOpen(false)}
                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors text-sm"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await refreshAutomaticMeterStart();
                          const isValid = await trigger([
                            "meterAwal",
                            "meterAkhir",
                          ]);
                          if (!isValid) return;

                          const currentMc = watch("nomorMc");
                          const currentMeterAkhir = parseFloat(
                            watch("meterAkhir") || "0",
                          );
                          if (currentMc === "T2A" && currentMeterAkhir === 0) {
                            setIsLastRoll(true);
                            setValue(
                              "tanggalPotong",
                              getJakartaDateString(),
                            );
                          }

                          const currentPcs = watch("pcsData") || [];
                          const cleanPcs = currentPcs.map((pcs) => ({
                            ...pcs,
                            indikatorStop: false,
                            kategoriMasalah: [],
                            detailMasalahMap: undefined,
                            detailMasalah: "",
                            spesifikMasalah: "",
                            keteranganCacat: "",
                          }));
                          setValue("pcsData", cleanPcs);
                          setValue("totalDowntime", "");

                          setIsMeterModalOpen(false);
                          handleSubmit(onSubmit, onInvalid)();
                        }}
                        disabled={isSubmitting}
                        className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex justify-center items-center gap-2 text-sm"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Simpan & Kirim Meteran
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>

        {isTourOpen && currentTourStep && (
          <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-[1px]" />
            {tourRect && (
              <div
                className="absolute rounded-2xl border-2 border-emerald-300 bg-white/10 shadow-[0_0_0_9999px_rgba(15,23,42,0.45),0_0_0_6px_rgba(16,185,129,0.18)] transition-all duration-200 pointer-events-none"
                style={{
                  top: Math.max(tourRect.top - 8, 8),
                  left: Math.max(tourRect.left - 8, 8),
                  width: tourRect.width + 16,
                  height: tourRect.height + 16,
                }}
              />
            )}
            <div
              className="absolute w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 p-5"
              style={{ top: tourCardTop, left: tourCardLeft }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    Step {tourStepIndex + 1} dari {METER_TOUR_STEPS.length}
                  </p>
                  <h4 className="text-base font-black text-slate-900 mt-1">
                    {currentTourStep.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={closeTour}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0"
                  aria-label="Tutup tour"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {currentTourStep.description}
              </p>
              <div className="flex items-center gap-2 mt-5">
                <button
                  type="button"
                  onClick={() =>
                    setTourStepIndex((step) => Math.max(step - 1, 0))
                  }
                  disabled={tourStepIndex === 0}
                  className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={
                    isLastTourStep
                      ? closeTour
                      : () => setTourStepIndex((step) => step + 1)
                  }
                  className="flex-1 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isLastTourStep ? "Selesai" : "Lanjut"}
                  {!isLastTourStep && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Sukses */}
        {successData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center animate-scaleIn text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              {(successData as any).isTargetSaved ? (
                <>
                  <h4 className="text-lg font-bold text-slate-800">
                    Target Tersimpan
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 mb-5">
                    Target Produksi {watch("meterAwal")} meter telah disimpan
                    untuk potongan ke-{watch("potonganKe")}.
                  </p>
                  <button
                    onClick={() => setSuccessData(null)}
                    className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition-all text-sm"
                  >
                    OK
                  </button>
                </>
              ) : (
                <>
                  <h4 className="text-lg font-bold text-slate-800">
                    {(successData as any).isOfflineSaved
                      ? "Tersimpan Offline"
                      : "Laporan Berhasil Disimpan"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 mb-5">
                    {(successData as any).isOfflineSaved
                      ? (successData as any).isCutSubmit
                        ? `Tanggal potong Potongan ke-${successData.potonganKe} antre dikirim otomatis saat sinyal pulih.`
                        : `Data Potongan ke-${successData.potonganKe} antre dikirim otomatis saat sinyal pulih.`
                      : (successData as any).isCutSubmit
                        ? `Laporan meteran Potongan ke-${successData.potonganKe} terekam. Tanggal potong juga diupdate pada semua data sebelumnya.`
                        : `Data laporan untuk Potongan ke-${successData.potonganKe} telah terekam.`}
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
                    {isEdit ? "Kembali ke Riwayat" : "Input Masalah Berikutnya"}
                  </button>
                </>
              )}
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
      </div>
    </div>
  );
}
