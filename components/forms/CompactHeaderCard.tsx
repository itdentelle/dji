import React from "react";
import { Box, User, Factory, FileText, CheckCircle2 } from "lucide-react";

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

export default function CompactHeaderCard(props: CompactHeaderCardProps) {
  // Parse fallbacks
  const potKe = props.potonganKe || (props.panelPotongan ? props.panelPotongan.split(" / ")[1] : "-");
  const rNo = props.rollNo || "-";
  const crs = props.course || (props.courseRpm ? props.courseRpm.split(" / ")[0] : "-");
  const rpm = props.rpm || (props.courseRpm ? props.courseRpm.split(" / ")[1] : "-");
  const tglProd = props.tanggalProduksi || "-";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 bg-slate-50/50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-1 max-w-5xl mx-auto text-sm">
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Design</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.design || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Nomor Mc</span>
              <span className="font-black text-[#0070bc] col-span-2 flex gap-2"><span>:</span> {props.nomorMc || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Tanggal produksi</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {tglProd}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Tanggal potong</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.tanggalPotong || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Pick</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.pick || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Course</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {crs}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Rpm</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {rpm}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">No. Order Barang</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.noOrder || "-"}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Potongan ke</span>
              <span className="font-black text-rose-600 col-span-2 flex gap-2"><span>:</span> {potKe}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Roll no</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {rNo}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Jenis Benang Dsr</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.benangDasar || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Liner</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.liner || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Heavy</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.heavy || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Shadow</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.shadow || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">Pinggiran</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.pinggiran || "-"}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <span className="font-bold text-slate-500">No. costumer</span>
              <span className="font-black text-slate-800 col-span-2 flex gap-2"><span>:</span> {props.noCustomer || "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
