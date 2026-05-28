-- DJI Supabase Database Seeder Script
-- Dihasilkan secara otomatis oleh Antigravity
-- Catatan: Tabel lookup akan disemai terlebih dahulu dengan ID tetap agar sinkron dengan form Kios

BEGIN;

-- Nonaktifkan sementara pemicu jika ada
SET session_replication_role = 'replica';

-- 1. SEED PROBLEM CATEGORIES
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (1, 'ELECTRIC') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (2, 'MEKANIK') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (3, 'ELEMENT RAJUTAN') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (4, 'BAHAN BAKU') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (5, 'MAINTENANCE/PERAWATAN') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (6, 'GANTI DESIGN') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (7, 'GANTI BENANG') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;
INSERT INTO public.problem_categories (id, nama_kategori) VALUES (8, 'MESIN STOP') ON CONFLICT (id) DO UPDATE SET nama_kategori = EXCLUDED.nama_kategori;

-- 2. SEED FINAL INSPECTIONS
INSERT INTO public.final_inspections (id, status_final) VALUES (1, 'GRADE A') ON CONFLICT (id) DO UPDATE SET status_final = EXCLUDED.status_final;
INSERT INTO public.final_inspections (id, status_final) VALUES (2, 'GRADE B') ON CONFLICT (id) DO UPDATE SET status_final = EXCLUDED.status_final;
INSERT INTO public.final_inspections (id, status_final) VALUES (3, 'BS') ON CONFLICT (id) DO UPDATE SET status_final = EXCLUDED.status_final;

-- 3. SEED GROUPS
INSERT INTO public.groups (id, nama_grup) VALUES (1, 'A') ON CONFLICT (id) DO UPDATE SET nama_grup = EXCLUDED.nama_grup;
INSERT INTO public.groups (id, nama_grup) VALUES (2, 'B') ON CONFLICT (id) DO UPDATE SET nama_grup = EXCLUDED.nama_grup;
INSERT INTO public.groups (id, nama_grup) VALUES (3, 'C') ON CONFLICT (id) DO UPDATE SET nama_grup = EXCLUDED.nama_grup;

-- 4. SEED DESIGNS
INSERT INTO public.designs (id, nama_design) VALUES (1, 'TCD 5826 XA') ON CONFLICT (id) DO UPDATE SET nama_design = EXCLUDED.nama_design;
INSERT INTO public.designs (id, nama_design) VALUES (2, 'DL 5675 CO') ON CONFLICT (id) DO UPDATE SET nama_design = EXCLUDED.nama_design;
INSERT INTO public.designs (id, nama_design) VALUES (3, 'DL 5167 CO') ON CONFLICT (id) DO UPDATE SET nama_design = EXCLUDED.nama_design;
INSERT INTO public.designs (id, nama_design) VALUES (4, 'DL 5169 CO') ON CONFLICT (id) DO UPDATE SET nama_design = EXCLUDED.nama_design;
INSERT INTO public.designs (id, nama_design) VALUES (5, 'DL 6460 CR') ON CONFLICT (id) DO UPDATE SET nama_design = EXCLUDED.nama_design;
INSERT INTO public.designs (id, nama_design) VALUES (6, 'DL 5162 CO') ON CONFLICT (id) DO UPDATE SET nama_design = EXCLUDED.nama_design;
INSERT INTO public.designs (id, nama_design) VALUES (7, 'DL 5168 CO') ON CONFLICT (id) DO UPDATE SET nama_design = EXCLUDED.nama_design;

-- 5. SEED OPERATORS
INSERT INTO public.operators (id, nama_operator) VALUES (1, 'Rani') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (2, 'Rini') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (3, 'Neneng') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (4, 'Royana') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (5, 'Ridwan') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (6, 'Rina') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (7, 'Riki') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (8, 'Parid') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (9, 'Irfan') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (10, 'Sigit') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (11, 'Irma') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (12, 'Hardi') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (13, 'Gilang') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (14, 'Komara') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (15, 'Novi') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (16, 'Jaya') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (17, 'Ahmad') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (18, 'Rohmat') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (19, 'Devi') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (20, 'Anwar') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (21, 'Sandi') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (22, 'Yanti') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;
INSERT INTO public.operators (id, nama_operator) VALUES (23, 'Iki') ON CONFLICT (id) DO UPDATE SET nama_operator = EXCLUDED.nama_operator;

-- 6. SEED PROBLEMS
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (1, 'A.1', 'Mati Listrik', 1) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (2, 'A.3', 'Error Servo Drive', 1) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (3, 'A.5', 'Error Shogging', 1) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (4, 'A.6', 'Error EBA', 1) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (5, 'A.7', 'Error Jacquard', 1) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (6, 'B.5', 'Perbaikan tensioner', 2) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (7, 'C.1', 'Perbaikan jarum pattern patah/bengkok', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (8, 'C.2', 'Perbaikan Jacquard', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (9, 'C.5', 'Perbaikan Keluar Jarum', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (10, 'C.7', 'Perbaikan bolong corak', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (11, 'C.9', 'Perbaikan Ngegaris/Stopline', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (12, 'D.5', 'Perbaikan benang narik/kendor', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (13, 'D.6', 'Perbaikan benang nyilang', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (14, 'D.7', 'Perbaikan benang pinggiran', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (15, 'D.8', 'Perbaikan benang kusut', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (16, 'D.9', 'Perbaikan L1/2/3 putus', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (17, 'D.10', 'Beset L1/L2/L3', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (18, 'D.13', 'Benang timbul putus', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (19, 'F.2', 'Perbaikan corak/revisi', 6) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (20, 'C.6', 'Perbaikan jarum mepet', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (21, 'D.3', 'Perbaikan benang kejepit/sisir', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (22, 'D.4', 'Perbaikan benang pecah', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (23, 'D.13', 'benang  timbul putus', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (24, 'C.3', 'Perbaikan ganti jarum/sparepart', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (25, 'D.1', 'Over Cone/Rewind', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (26, 'C.4', 'Perbaikan ngampul', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (27, NULL, 'Bt', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (28, NULL, 'narik', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (29, NULL, 'Perbaikan bolong dasar', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (30, NULL, 'L1 putus', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (31, NULL, 'L1.kusut', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (32, NULL, 'L2.k.j', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (33, NULL, 'Benang timbul lengket', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (34, NULL, 'Perbaikan ganti jarum compond', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (35, NULL, 'Perbaikan liner nyilang', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (36, NULL, 'Benang timbul kendor', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (37, NULL, 'benang timbul k/jarum', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (38, NULL, 'mx narik putus', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (39, NULL, 'lengketan L2 narik putus', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (40, NULL, 'mx lengket', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (41, NULL, 'putus', 3) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;
INSERT INTO public.problems (id, kode_masalah, deskripsi_masalah, category_id) VALUES (42, NULL, 'perb. ngerut', 4) ON CONFLICT (id) DO UPDATE SET kode_masalah = EXCLUDED.kode_masalah, deskripsi_masalah = EXCLUDED.deskripsi_masalah, category_id = EXCLUDED.category_id;

-- 7. RESET SERIAL SEQUENCES
SELECT setval(pg_get_serial_sequence('public.operators', 'id'), coalesce(max(id), 1)) FROM public.operators;
SELECT setval(pg_get_serial_sequence('public.designs', 'id'), coalesce(max(id), 1)) FROM public.designs;
SELECT setval(pg_get_serial_sequence('public.groups', 'id'), coalesce(max(id), 1)) FROM public.groups;
SELECT setval(pg_get_serial_sequence('public.problem_categories', 'id'), coalesce(max(id), 1)) FROM public.problem_categories;
SELECT setval(pg_get_serial_sequence('public.problems', 'id'), coalesce(max(id), 1)) FROM public.problems;
SELECT setval(pg_get_serial_sequence('public.final_inspections', 'id'), coalesce(max(id), 1)) FROM public.final_inspections;

-- Aktifkan kembali pemicu
SET session_replication_role = 'origin';

COMMIT;