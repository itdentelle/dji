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
    .min(1, "Jumlah hasil produksi harus diisi")
    .regex(/^\d+$/, "Hasil produksi harus berupa angka positif"),
  statusInspeksi: z.enum(["lolos", "recheck"], {
    message: "Pilih status inspeksi yang valid",
  }),
  keterangan: z.string().max(200, "Keterangan maksimal 200 karakter").optional().nullable(),
  pic: z.string().max(100, "Nama PIC maksimal 100 karakter").optional().nullable(),
  problems: z.record(
    z.string(),
    z.object({
      problemId: z.string().min(1, "Masalah harus dipilih jika kategori aktif"),
      keterangan: z.string().max(200, "Keterangan masalah maksimal 200 karakter").optional().nullable(),
    })
  ).optional().nullable(),
  fotoBefore: z.string().optional().nullable(),
  fotoAfter: z.string().optional().nullable(),
});

export type ProductionFormInput = z.infer<typeof productionFormSchema>;


