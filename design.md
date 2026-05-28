# Project: Enterprise Dashboard, Employee Portal & Chatbot System

## 1. Project Overview
Aplikasi ini adalah sistem *fullstack* terintegrasi yang dioptimalkan untuk perangkat kios tablet perusahaan serta desktop, mencakup:
- *Dashboard* analitik internal perusahaan (khusus Admin/Atasan).
- Portal input data otomatis untuk pegawai.
- Antarmuka *chatbot* cerdas (khusus Atasan/Manager/Admin).
Sistem ini menggunakan Supabase sebagai Backend-as-a-Service (BaaS) untuk *database* dan autentikasi, serta n8n sebagai *orchestrator* utama untuk logika AI dan *chatbot*.

## 2. Technology Stack
Agent WAJIB menggunakan teknologi berikut secara eksklusif kecuali diinstruksikan lain:
- **Frontend / Client:** Next.js (App Router), React.js, Tailwind CSS (Mobile-first & Responsive design), komponen UI (Radix/Shadcn), dan Zustand/Context untuk *state management* lokal.
- **Form & Validation:** React Hook Form dikombinasikan dengan Zod untuk skema validasi (termasuk validasi 6-digit PIN).
- **Backend / Database & Auth:** Supabase (PostgreSQL) dengan `@supabase/ssr`. Autentikasi menggunakan metode Custom PIN Authentication berbasis tabel profil pengguna di Supabase.
- **Workflow Automation:** n8n (berjalan di server eksternal/terpisah).
- **API Handling:** Next.js Route Handlers (`/app/api/...`) dan Server Actions.

## 3. Architecture & Integration Protocol
- **Supabase & Custom PIN Auth:** Karena dijalankan di tablet bersama, login menggunakan skema input 6-digit PIN. Proses verifikasi PIN dilakukan via *Server Actions* yang mencocokkan PIN terenkripsi/hashed di database Supabase dan membuat sesi sesi/cookie yang aman.
- **Role-Based Access Control (RBAC):** Pemisahan hak akses menggunakan Next.js Middleware berdasarkan *role* di database:
  - `admin`: Akses penuh (`/dashboard`, `/chatbot`, `/employee`).
  - `manager`: Akses khusus atasan (`/chatbot`, `/employee`, `/dashboard` terbatas).
  - `employee`: Akses terbatas hanya untuk portal input data (`/employee`). *Route* `/chatbot` wajib diblokir untuk role ini.
- **Alur Input Data Pegawai:** 
  `UI Form (Client)` -> `Zod Validation (Client)` -> `Server Action (Backend)` -> `Zod Validation (Server)` -> `Supabase Database`.
- **Alur Pesan Chatbot (n8n Integration):** 
  `UI Chatbot (Client)` -> `Next.js API Route (/app/api/chat)` -> Verifikasi Sesi Atasan -> `n8n Webhook Endpoint` -> `LLM/AI` -> `Return to API Route` -> `UI Chatbot`.

## 4. Comprehensive Folder Structure
Agent harus mengikuti pemisahan logis antara frontend (UI) dan backend (Server/API) berikut:

```text
/
├── design.md                  # THIS FILE - Source of truth
├── /app                       # NEXT.JS APP ROUTER (Routing)
│   ├── /(auth)                # Group route: Login menggunakan UI Pad PIN Kios
│   │   └── login/page.tsx
│   ├── /(dashboard)           # Group route: Admin/Atasan Dashboard (Protected)
│   │   ├── layout.tsx
│   │   └── page.tsx           
│   ├── /(employee)            # Group route: Data Input Portal (Protected & Responsive)
│   │   └── input/page.tsx     # Form UI untuk pegawai (dioptimalkan untuk tablet)
│   ├── /chatbot               # Chatbot UI (Hanya untuk Admin/Manager, Employee diblokir)
│   │   └── page.tsx
│   └── /api                   # BACKEND: Next.js Route Handlers
│       ├── /chat              # Endpoint komunikasi ke n8n webhook (Cek Role Atasan)
│       │   └── route.ts
│       └── /webhooks          # Endpoint untuk menerima trigger/webhook masuk
├── /components                # FRONTEND: Reusable UI Components
│   ├── /ui                    # Shadcn/Radix components (buttons, inputs, dialogs)
│   ├── /forms                 # PIN Pad Component, Form input pegawai
│   └── /layout                # Responsive Sidebar, Mobile Navbar
├── /actions                   # BACKEND: Next.js Server Actions (Data mutations)
│   ├── employee-actions.ts    # Logika insert/update data pegawai ke Supabase
│   └── auth-actions.ts        # Logika verifikasi 6-Digit PIN & Session Management
├── /lib                       # SHARED: Utilities & Configurations
│   ├── /supabase              # Supabase clients (server.ts, client.ts, middleware.ts)
│   ├── /schemas               # Zod schemas (Skema validasi Form & Skema PIN 6-digit)
│   └── utils.ts               # Helper functions (cn untuk Tailwind, dll)
├── /types                     # SHARED: TypeScript Definitions
│   ├── database.types.ts      # Tipe data Supabase (hasil generate)
│   └── index.ts               # Tipe data kustom frontend/backend
├── middleware.ts              # BACKEND: Perlindungan Route, Deteksi Sesi PIN & RBAC (Atasan vs Pegawai)
└── package.json