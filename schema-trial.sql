-- 1. Buat Tabel Dasar (Master Data)
CREATE TABLE IF NOT EXISTS public.groups (
    id SERIAL PRIMARY KEY,
    nama_grup text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.operators (
    id SERIAL PRIMARY KEY,
    nama_operator text NOT NULL,
    shift text
);

CREATE TABLE IF NOT EXISTS public.machines (
    id SERIAL PRIMARY KEY,
    mesin_id text NOT NULL,
    status text
);

CREATE TABLE IF NOT EXISTS public.designs (
    id SERIAL PRIMARY KEY,
    nama_desain text NOT NULL
);

-- 2. Buat Tabel Header Transaksi Produksi
CREATE TABLE IF NOT EXISTS public.production_headers (
    id text PRIMARY KEY,
    tgl date,
    tanggal_jam timestamp with time zone,
    operator_id int8 REFERENCES public.operators(id),
    group_id int8 REFERENCES public.groups(id),
    design_id text,
    nomor_mc text,
    status_matching text,
    course text,
    rpm int8,
    potongan_ke int8,
    panel_no text,
    pcs int8,
    tanggal_potong text,
    pick text,
    no_order_barang text,
    no_customer text,
    jenis_benang_dasar text,
    liner text,
    heavy text,
    shadow text,
    pinggiran text,
    foto_before text,
    foto_after text,
    total_downtime_detik int8,
    idempotency_key text,
    created_by_name text,
    pic text,
    downtime_events jsonb,
    operator_backup text,
    total_produksi_meter int8
);

-- 3. Buat Tabel Detail Transaksi Produksi
CREATE TABLE IF NOT EXISTS public.production_details (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    header_id text REFERENCES public.production_headers(id) ON DELETE CASCADE,
    pcs_index int8,
    jml_hasil_produksi int8,
    kategori_masalah text,
    detail_masalah text,
    indikator_stop text
);

-- 4. Buat Tabel Cacat (Defects)
CREATE TABLE IF NOT EXISTS public.production_defects (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    header_id text REFERENCES public.production_headers(id) ON DELETE CASCADE,
    kategori text
);

-- 5. Buat Tabel QC & Mending (Opsional jika digunakan)
CREATE TABLE IF NOT EXISTS public.qc_inspections (
    id SERIAL PRIMARY KEY,
    header_id text REFERENCES public.production_headers(id) ON DELETE CASCADE,
    inspector_name text,
    status text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.qc_inspection_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    qc_inspection_id int8 REFERENCES public.qc_inspections(id) ON DELETE CASCADE,
    production_detail_id uuid REFERENCES public.production_details(id) ON DELETE CASCADE,
    kategori_cacat text,
    jumlah int8
);

CREATE TABLE IF NOT EXISTS public.mending_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    production_detail_id uuid REFERENCES public.production_details(id) ON DELETE CASCADE,
    mending_operator text,
    status text,
    created_at timestamp with time zone DEFAULT now()
);

-- Masukkan Data Master Awal (Opsional)
INSERT INTO public.groups (nama_grup) VALUES ('A'), ('B'), ('C') ON CONFLICT DO NOTHING;
