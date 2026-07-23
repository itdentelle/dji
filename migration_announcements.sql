-- Tabel untuk menyimpan Pengumuman / Running Text Global Admin
CREATE TABLE IF NOT EXISTS public.app_announcements (
    id TEXT PRIMARY KEY DEFAULT 'global',
    message TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Izinkan akses read & write untuk anon / authenticated user (atau sesuaikan RLS)
ALTER TABLE public.app_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to app_announcements"
    ON public.app_announcements FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update to app_announcements"
    ON public.app_announcements FOR ALL USING (true);

-- Insert record default jika belum ada
INSERT INTO public.app_announcements (id, message, is_active)
VALUES ('global', '', false)
ON CONFLICT (id) DO NOTHING;
