import React from "react";
import { Factory, Layers, Scissors, Hash, Zap, ShoppingBag, User, Calendar } from "lucide-react";

interface CompactHeaderCardProps {
  nomorMc: string;
  shiftName: string;
  operatorName: string;
  design: string;
  pcsCount: number;

  // Spesifikasi Produksi
  panelPotongan: string;
  courseRpm: string;
  noCustomer: string;
  noOrder: string;
  tanggalPotong: string;
  statusMatching: string;
  pick: string;

  // Benang & Material
  benangDasar: string;
  liner: string;
  heavy: string;
  shadow: string;
  pinggiran: string;

  // Added for report parity
  tanggalProduksi?: string;
  rollNo?: string;
  course?: string;
  rpm?: string;
  potonganKe?: string;
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate">
        {label}
      </span>
      <span
        className={`text-[11px] sm:text-xs font-extrabold leading-snug break-words ${
          highlight ? "text-[#0070bc]" : "text-slate-800"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function formatFullDateTime(dateVal?: string): string {
  if (!dateVal || dateVal === "-" || dateVal === "—") return "—";

  try {
    let str = String(dateVal).trim();
    if (!str) return "—";

    // If it's already a clean formatted date string without T/Z, return as is
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(str)) {
      return str;
    }

    let dt: Date;
    if (str.includes("T")) {
      if (!str.includes("Z") && !str.includes("+") && !str.includes("-", 10)) {
        str = str + "Z";
      }
      dt = new Date(str);
    } else if (str.includes(" ")) {
      const parts = str.split(" ");
      const dPart = parts[0];
      const tPart = parts[1] || "00:00:00";
      if (!str.includes("Z") && !str.includes("+")) {
        dt = new Date(`${dPart}T${tPart}Z`);
      } else {
        dt = new Date(str);
      }
    } else {
      dt = new Date(str);
    }

    if (isNaN(dt.getTime())) {
      return dateVal;
    }

    const year = dt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" });
    const month = dt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta", month: "2-digit" });
    const day = dt.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta", day: "2-digit" });
    const timeStr = dt.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).replace(".", ":");

    return `${year}-${month}-${day} ${timeStr}`;
  } catch (e) {
    return dateVal;
  }
}

export default function CompactHeaderCard(props: CompactHeaderCardProps) {
  const potKe = props.potonganKe || (props.panelPotongan ? props.panelPotongan.split(" / ")[1] : "-");
  const crs = props.course || (props.courseRpm ? props.courseRpm.split(" / ")[0] : "-");
  const rpm = props.rpm || (props.courseRpm ? props.courseRpm.split(" / ")[1] : "-");
  const tglProd = formatFullDateTime(props.tanggalProduksi);
  const tglPotong = formatFullDateTime(props.tanggalPotong);

  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-slate-200 mb-6">
      {/* === BANNER HEADER === */}
      <div
        className="relative px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0b3068 50%, #0070bc 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -right-2 -bottom-10 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        {/* Left: Machine + Potongan */}
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 shrink-0">
            <Factory className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <div className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5">
              Nomor Mesin
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
              {props.nomorMc || "—"}
            </div>
            <div className="mt-1 text-sky-300 text-xs font-bold">
              Potongan Ke-{potKe}
            </div>
          </div>
        </div>

        {/* Right: Design + Date */}
        <div className="z-10 flex flex-col items-start sm:items-end gap-2">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1.5">
            <span className="text-white/50 text-[9px] uppercase tracking-widest font-bold block">Design</span>
            <span className="text-white font-black text-sm sm:text-base tracking-tight">
              {props.design || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1">
              <Calendar className="w-3 h-3 text-sky-300 shrink-0" />
              <span className="text-sky-200 text-[10px] sm:text-xs font-bold">{tglProd}</span>
            </div>
          </div>
        </div>
      </div>

      {/* === BODY === */}
      <div className="bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

          {/* LEFT: Spesifikasi Produksi */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">
                Spesifikasi Produksi
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
              <InfoField label="Tanggal Produksi" value={tglProd} />
              <InfoField label="Tanggal Potong" value={tglPotong} />
              <InfoField label="Pick" value={props.pick} />
              <InfoField label="Course" value={crs} />
              <InfoField label="RPM" value={rpm} />
              <InfoField label="No. Order Barang" value={props.noOrder} />
              <InfoField label="No. Customer" value={props.noCustomer} />
            </div>
          </div>

          {/* RIGHT: Material Benang */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center">
                <Scissors className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest">
                Material Benang
              </span>
            </div>
            <div className="grid grid-cols-1 gap-y-3.5">
              <InfoField label="Jenis Benang Dasar" value={props.benangDasar} />
              <InfoField label="Liner" value={props.liner} />
              <InfoField label="Heavy" value={props.heavy} />
              <InfoField label="Shadow" value={props.shadow} />
              <InfoField label="Pinggiran" value={props.pinggiran} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
