import React from 'react';

export interface SuratJalanPrintTemplateProps {
  data: {
    no_surat_jalan: string;
    tanggal: string;
    created_at?: string;
    tujuan: string;
    surat_jalan_details: any[];
  };
}

export default function SuratJalanPrintTemplate({ data }: SuratJalanPrintTemplateProps) {
  let parsedTujuan = { 
    tujuan: data.tujuan, 
    alamat_detail: "", 
    kab_kota: "", 
    provinsi: "", 
    kode_pos: "", 
    negara: "", 
    telepon: "",
    pakai_benang_dji: false
  };
  try {
    const t = JSON.parse(data.tujuan);
    if (t.tujuan) parsedTujuan = { ...parsedTujuan, ...t };
  } catch(e) {
    // Legacy plain string format
  }

  const printDate = new Date(data.tanggal).toLocaleDateString('en-GB');
  const printTime = data.created_at ? new Date(data.created_at).toLocaleTimeString('en-GB') : "";

  return (
    <div className="w-full h-[148mm] relative text-[11px] font-sans text-slate-700 bg-white overflow-hidden p-[10mm]">
      {/* KOP SURAT */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-4 w-1/2">
          <img src="/assets/dji-logo.png" alt="DJI Logo" className="w-10 h-10 object-contain" />
          <div className="leading-tight text-[10px]">
            <div className="font-bold text-slate-600 text-[11px]">PT Dentelle Jaya Infinitex</div>
            <div className="text-slate-500">Jl. Cangkorah, RT 002/RW 05, Giriasih</div>
            <div className="text-slate-500">Kec. Batujajar</div>
            <div className="text-slate-500">Bandung Barat JB 40561</div>
            <div className="text-slate-500">Indonesia</div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-400 mb-2"></div>

      {/* INFO PENGIRIMAN */}
      <div className="flex mb-4">
        <div className="w-1/2">
          <h1 className="text-lg text-slate-500 font-normal mb-1 tracking-wide">Delivery Order</h1>
          <h2 className="text-lg font-medium tracking-widest text-slate-600 mb-2">{data.no_surat_jalan}</h2>
          
          <div className="flex gap-8 text-slate-600 text-[10px]">
             <div>
                <div className="font-semibold text-slate-500 mb-0.5">Order:</div>
                <div>{data.surat_jalan_details?.[0]?.no_order?.split("|||")?.[1] || "-"}</div>
             </div>
             <div>
                <div className="font-semibold text-slate-500 mb-0.5">Shipping Date:</div>
                <div>{printDate} {printTime}</div>
             </div>
          </div>
        </div>
        <div className="w-1/2 pl-8 leading-tight text-[10px]">
          <div className="uppercase text-slate-600 font-medium mb-1">{parsedTujuan.tujuan}</div>
          <div className="text-slate-500">{parsedTujuan.alamat_detail}</div>
          {(parsedTujuan.kab_kota || parsedTujuan.provinsi) && (
            <div className="text-slate-500">
              {parsedTujuan.kab_kota && <span>{parsedTujuan.kab_kota} </span>}
              {parsedTujuan.provinsi && <span>{parsedTujuan.provinsi} </span>}
              {parsedTujuan.kode_pos && <span>{parsedTujuan.kode_pos}</span>}
            </div>
          )}
          <div className="text-slate-500">{parsedTujuan.negara}</div>
          {parsedTujuan.telepon && <div className="text-slate-500 mt-1">{parsedTujuan.telepon}</div>}
        </div>
      </div>

      {/* TABLE HEADER */}
      <div className="flex justify-between font-semibold text-blue-500 mb-2 border-b border-slate-200 pb-1 text-[10px]">
         <div className="w-3/4">Product</div>
         <div className="w-1/4 text-right">Quantity</div>
      </div>

      {/* DETAILS */}
      <div className="max-h-[50mm] overflow-hidden">
        {Object.entries(
          // Group by design_id
          data.surat_jalan_details.reduce((acc: any, item: any) => {
            const key = item.design_id || 'Unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {})
        ).map(([design, items]: [string, any]) => {
          const totalWeight = items.reduce((sum: number, i: any) => sum + parseFloat(i.berat_kain || 0), 0);
          
          // Sub-group by MC and Potongan
          const subGroups: Record<string, any[]> = {};
          items.forEach((i: any) => {
             const k = `${i.nomor_mc}-${i.potongan_ke}`;
             if (!subGroups[k]) subGroups[k] = [];
             subGroups[k].push(i);
          });

          return (
            <div key={design} className="mb-4 text-[10px]">
              {/* Product Name & Quantity Row */}
              <div className="flex justify-between mb-2 text-slate-600">
                <div>{design}</div>
                <div>{totalWeight.toFixed(2)} KGS</div>
              </div>
              
              {/* Total label */}
              <div className="text-blue-500 font-semibold">Total</div>
              <div className="text-slate-600 mb-2">{totalWeight.toFixed(2)} KGS</div>
              
              {/* Sub details */}
              {parsedTujuan.pakai_benang_dji && (
                <div className="font-semibold text-slate-500 bg-slate-50 inline-block px-1 mb-1 rounded text-[9px]">Pakai benang Dji</div>
              )}
              <div className="text-slate-500 leading-[1.4] text-[9px]">
                {Object.values(subGroups).map((batchItems, idx) => {
                   // Sort by pcs_ke ascending so it renders 1, 2, 3 etc correctly
                   batchItems.sort((a, b) => {
                     const getPcs = (item: any) => item.no_order && item.no_order.includes("|||") ? parseInt(item.no_order.split("|||")[0]) || 0 : 0;
                     return getPcs(a) - getPcs(b);
                   });

                   const first = batchItems[0];
                   
                   let noOb = first.no_order;
                   let noCust = "-";
                   if (noOb && noOb.includes("|||")) {
                     const parts = noOb.split("|||");
                     noOb = parts[1] || "-";
                     noCust = parts[2] || "-";
                   }

                   const pcsList = batchItems.map(i => {
                      if (i.no_order && i.no_order.includes("|||")) return i.no_order.split("|||")[0] || "-";
                      return "-";
                   }).join(",");

                   const weightsStr = batchItems.map(i => `1pcsX${i.jumlah_panel}PANEL=${parseFloat(i.berat_kain).toFixed(2)}kg(${i.grade})`).join(" ");

                   return (
                     <div key={idx}>
                       {design} {first.nomor_mc}/{first.potongan_ke}/{pcsList} {weightsStr} No.OB. {noOb} ({noCust})
                     </div>
                   );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER - Signatures & Bottom Info */}
      <div className="absolute bottom-[10mm] left-[10mm] right-[10mm]">
        <div className="flex justify-between items-end mb-4 px-8">
          <div className="text-center w-32">
            <div className="border-b border-slate-500 h-10 w-full relative"></div>
          </div>
          <div className="text-center w-32">
            <div className="border-b border-slate-500 h-10 w-full relative"></div>
          </div>
        </div>
        
        <div className="text-center text-[9px] text-slate-500 border-t border-slate-400 pt-1">
          Email: dentelle.finance16@gmail.com NPWP: 535632830421000
        </div>
      </div>
    </div>
  );
}
