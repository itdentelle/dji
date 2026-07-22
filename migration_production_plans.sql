-- Migration Script untuk Tabel Jadwal Produksi (production_plans)
-- Silakan jalankan script ini di SQL Editor Supabase Anda

CREATE TABLE IF NOT EXISTS public.production_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nomor_mc text NOT NULL,
    potongan_ke integer NOT NULL,
    design_id text,
    pick text,
    course text,
    no_order_barang text,
    no_customer text,
    jenis_benang_dasar text,
    liner text,
    heavy text,
    shadow text,
    pinggiran text,
    rpm text,
    pcs_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint agar satu mesin di satu potongan hanya punya maksimal 1 jadwal aktif
    UNIQUE(nomor_mc, potongan_ke)
);

-- Script Tambahan jika tabel sudah ada (Jalankan ini di Supabase SQL Editor):
-- ALTER TABLE public.production_plans ADD COLUMN IF NOT EXISTS pcs_count integer DEFAULT 1;

-- Bolehkan akses RLS (Row Level Security) agar user bisa mengakses dari aplikasi
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;

-- Policy untuk public/authenticated access (sesuaikan dengan aturan RLS Anda saat ini)
CREATE POLICY "Enable read access for all users" ON public.production_plans FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.production_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON public.production_plans FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users" ON public.production_plans FOR DELETE USING (true);

-- Membuat trigger untuk otomatis update updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_production_plans_modtime ON public.production_plans;
CREATE TRIGGER update_production_plans_modtime
    BEFORE UPDATE ON public.production_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Migration Script untuk Tabel Konfigurasi Mesin (machine_configs)
CREATE TABLE IF NOT EXISTS public.machine_configs (
    nomor_mc text PRIMARY KEY,
    default_pcs integer DEFAULT 1,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.machine_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for machine_configs" ON public.machine_configs FOR ALL USING (true) WITH CHECK (true);
