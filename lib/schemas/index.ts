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
export const productionFormSchema = z.object({
  operatorId: z.string().min(1, "Operator harus dipilih"),
  groupId: z.string().min(1, "Grup Shift harus dipilih"),
  designId: z.string().min(1, "Design harus dipilih"),
// Header Data
  nomorMc: z.string().optional().nullable(),
  tanggalProduksi: z.string().optional().nullable(),
  tanggalPotong: z.string().optional().nullable(),
  pick: z.string().optional().nullable(),
  noOrderBarang: z.string().optional().nullable(),
  rollNo: z.string().optional().nullable(),
  jenisBenangDasar: z.string().optional().nullable(),
  liner: z.string().optional().nullable(),
  heavy: z.string().optional().nullable(),
  shadow: z.string().optional().nullable(),
  pinggiran: z.string().optional().nullable(),
  
  // Panel Data
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
  pcs: z.string().optional().nullable(),
  jmlHasilProduksi: z
    .string()
    .optional() // Kadang tidak diisi di kertas
    .nullable(),
  pic: z.string().max(100, "Nama PIC maksimal 100 karakter").optional().nullable(),
  
  // Data Cacat / Mesin Stop
  indikatorStop: z.boolean().optional(),
  kategoriMasalah: z.string().optional().nullable(),
  detailMasalah: z.string().optional().nullable(),
  keteranganCacat: z.string().max(200, "Keterangan maksimal 200 karakter").optional().nullable(),
  
  fotoBefore: z.string().optional().nullable(),
  fotoAfter: z.string().optional().nullable(),
});

export type ProductionFormInput = z.infer<typeof productionFormSchema>;


