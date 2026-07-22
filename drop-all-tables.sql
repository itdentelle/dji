-- PERINGATAN: SCRIPT INI AKAN MENGHAPUS SELURUH TABEL DAN ISINYA SECARA PERMANEN
-- Jalankan ini di SQL Editor Supabase HANYA jika Anda ingin mengulang dari awal (Reset Database)

DROP TABLE IF EXISTS public.mending_items CASCADE;
DROP TABLE IF EXISTS public.qc_inspection_items CASCADE;
DROP TABLE IF EXISTS public.qc_inspections CASCADE;
DROP TABLE IF EXISTS public.production_defects CASCADE;
DROP TABLE IF EXISTS public.production_details CASCADE;
DROP TABLE IF EXISTS public.production_headers CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP TABLE IF EXISTS public.designs CASCADE;
DROP TABLE IF EXISTS public.operators CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;

-- Jika Anda ingin cara instan yang menghapus SEMUA hal di skema public (termasuk view, function, dll):
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
