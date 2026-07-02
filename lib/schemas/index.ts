import { z } from "zod";

// Skema untuk validasi PIN 6-digit
export const pinSchema = z.object({
  pin: z
    .string()
    .length(6, "PIN harus tepat 6 digit")
    .regex(/^[0-9]+$/, "PIN hanya boleh berisi angka"),
});

export type PinSchemaInput = z.infer<typeof pinSchema>;

// Skema untuk Form Portal Input Produksi Harian (Sesuai Supabase Productions Table)
export const productionFormSchemaBase = z.object({
  operatorId: z.string().min(1, "Minimal pilih 1 operator"),
  groupId: z.string().min(1, "Grup Shift harus dipilih"),
  grupName: z.string().optional(),
  designId: z.string().min(1, "Design harus dipilih"),
  designName: z.string().optional(),
  created_by_name: z.string().optional().nullable(),
// Header Data
  nomorMc: z.string().optional().nullable(),
  statusMatching: z.string().min(1, "Status Matching harus dipilih"),
  tanggalProduksi: z.string().optional().nullable(),
  tanggalPotong: z.string().optional().nullable(),
  pick: z.string().optional().nullable(),
  noOrderBarang: z.string().optional().nullable(),
  noCustomer: z.string().optional().nullable(),
  jenisBenangDasar: z.string().optional().nullable(),
  liner: z.string().optional().nullable(),
  heavy: z.string().optional().nullable(),
  shadow: z.string().optional().nullable(),
  pinggiran: z.string().optional().nullable(),
  
  // Data Umum Panel (dibagikan ke semua panel dalam 1 submit)
  rpm: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\d+$/.test(val), {
      message: "RPM harus berupa angka positif jika diisi",
    }),
  potonganKe: z
    .string()
    .min(1, "Potongan ke- harus diisi")
    .regex(/^\d+$/, "Nomor potongan harus berupa angka positif"),
  panelNo: z
    .string()
    .min(1, "Nomor Panel harus diisi")
    .regex(/^\d+$/, "Nomor panel harus berupa angka positif"),
  course: z.string().optional().nullable(),
  pic: z.string().max(100, "Nama PIC maksimal 100 karakter").optional().nullable(),
  
  fotoBefore: z.string().optional().nullable(),
  fotoAfter: z.string().optional().nullable(),

  // Waktu Berhenti (Global)
  totalDowntime: z.string().optional().nullable(),

  // Array of PCS Data untuk satu Panel
  pcsData: z.array(
    z.object({
      pcsIndex: z.string(), // Misalnya "1", "2", "3"
      jmlHasilProduksi: z.string().optional().nullable(),
      indikatorStop: z.boolean().optional(),
      kategoriMasalah: z.array(z.string()).optional(),
      detailMasalahMap: z.record(z.string(), z.string()).optional(),
      detailMasalah: z.string().optional().nullable(),
      meterKain: z.string().optional().nullable(),
      keteranganCacat: z.string().max(200, "Keterangan maksimal 200 karakter").optional().nullable(),
    })
  ).min(1, "Minimal harus ada 1 PCS"),
  idempotencyKey: z.string().optional(),
});

export const productionFormSchema = productionFormSchemaBase.superRefine((data, ctx) => {
  const hasMasalah = data.pcsData && data.pcsData.some(pcs => pcs.indikatorStop);

  if (data.pcsData && data.pcsData.length > 0) {
    data.pcsData.forEach((pcs, index) => {
      if (pcs.indikatorStop) {
        if (!pcs.kategoriMasalah || pcs.kategoriMasalah.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wajib memilih minimal 1 Kategori Masalah jika mencentang cacat",
            path: ["pcsData", index, "kategoriMasalah"],
          });
        } else {
          pcs.kategoriMasalah.forEach((catId) => {
            if (!pcs.detailMasalahMap || !pcs.detailMasalahMap[catId] || pcs.detailMasalahMap[catId].trim() === "") {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Wajib memilih Detail Masalah`,
                path: ["pcsData", index, "detailMasalahMap", catId],
              });
            }
          });
        }
      }
    });
  }

  if (hasMasalah) {
    if (!data.totalDowntime || data.totalDowntime.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wajib mengisi Estimasi Waktu Mesin Berhenti (Downtime) jika terdapat masalah/cacat",
        path: ["totalDowntime"],
      });
    }
  }
});

export type ProductionFormInput = z.infer<typeof productionFormSchema>;

export const continuousFormSchema = productionFormSchemaBase.omit({ panelNo: true, pcsData: true }).extend({
  meterAwal: z.string().optional().nullable(),
  meterAkhir: z.string().optional().nullable(),
  hasilProduksiMeter: z.string().optional().nullable(),
  pcsData: z.array(
    z.object({
      pcsIndex: z.string(),
      jmlHasilProduksi: z.string().optional().nullable(),
      indikatorStop: z.boolean().optional(),
      kategoriMasalah: z.array(z.string()).optional(),
      detailMasalahMap: z.record(z.string(), z.string()).optional(),
      detailMasalah: z.string().optional().nullable(),
      meterKain: z.string().optional().nullable(),
      rollNo: z.string().optional().nullable(),
      keteranganCacat: z.string().max(200, "Keterangan maksimal 200 karakter").optional().nullable(),
    })
  ),
}).superRefine((data, ctx) => {
  const hasMeter = data.meterAkhir && data.meterAkhir.trim() !== "";
  const hasMasalah = data.pcsData && data.pcsData.some(pcs => pcs.indikatorStop);
  if (!hasMeter && !hasMasalah) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Anda harus mencentang 'Terdapat Cacat' pada setidaknya 1 PCS",
      path: ["pcsData"],
    });
  }

  if (data.pcsData && data.pcsData.length > 0) {
    data.pcsData.forEach((pcs, index) => {
      if (pcs.indikatorStop) {
        if (!pcs.kategoriMasalah || pcs.kategoriMasalah.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wajib memilih minimal 1 Kategori Masalah jika mencentang cacat",
            path: ["pcsData", index, "kategoriMasalah"],
          });
        } else {
          pcs.kategoriMasalah.forEach((catId) => {
            if (!pcs.detailMasalahMap || !pcs.detailMasalahMap[catId] || pcs.detailMasalahMap[catId].trim() === "") {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Wajib memilih Detail Masalah`,
                path: ["pcsData", index, "detailMasalahMap", catId],
              });
            }
          });
        }
      }
    });
  }

  if (hasMasalah) {
    if (!data.totalDowntime || data.totalDowntime.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wajib mengisi Estimasi Waktu Mesin Berhenti (Downtime) jika terdapat masalah/cacat",
        path: ["totalDowntime"],
      });
    }
  }
});
export type ContinuousFormInput = z.infer<typeof continuousFormSchema>;
