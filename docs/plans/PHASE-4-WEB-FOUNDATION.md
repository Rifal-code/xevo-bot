# PHASE 4 — WEB FOUNDATION PLAN

> **Dokumen:** `docs/plans/PHASE-4-WEB-FOUNDATION.md`  
> **Status:** Menunggu Persetujuan Pemilik Project  
> **Tanggal:** 22 November 2026  
> **Target Approval:** `APPROVE PHASE-4`

---

## A. Objective

Membangun fondasi aplikasi web modern menggunakan **Next.js App Router + TypeScript**, mengonfigurasi klien Supabase (Server & Browser Client) dengan Supabase Auth, menyiapkan klien Redis untuk rate-limiting, menyusun *design tokens* (identitas visual Xevo Spider Red), responsive app shell/layout, serta `.env.example` tanpa secret.

---

## B. Current Findings & Fondasi yang Sudah Tersedia

1. **WhatsApp Engine Telah Siap & Terproteksi (Phase 1 & 2):**
   - Berjalan mandiri pada port 5004 dengan Baileys resmi (`@whiskeysockets/baileys@6.7.24`).
   - Seluruh celah RCE eval/exec telah dibersihkan.
   - Endpoint internal terlindungi dengan `ENGINE_INTERNAL_SECRET`.
   - Auto-follow channel WhatsApp tetap aktif sesuai instruksi pemilik.
2. **Arsitektur & Kontrak Integrasi Telah Disetujui (Phase 3):**
   - Dokumen `SYSTEM_ARCHITECTURE.md`, `ENGINE_INTEGRATION_CONTRACT.md`, dan `DATABASE_SCHEMA.md` telah selesai dan tersimpan di repository GitHub.
3. **Kebutuhan Web Foundation:**
   - Diperlukan project Next.js baru yang terstruktur bersih di dalam workspace tanpa mengganggu file WhatsApp Engine (`index.js`, `server.js`, `lib/`, `Xevo.js`).
   - Identitas visual dari `public/index.html` (Spider Red, brutalist dark cards, typography Space Mono & Inter) akan diekstrak menjadi design tokens Tailwind CSS.

---

## C. Scope Phase 4

### Yang Dikerjakan:
1. Menginisialisasi Next.js App Router dengan TypeScript dan Tailwind CSS (misal di folder `web/` atau root terintegrasi yang bersih).
2. Menyiapkan helper Supabase Client:
   - `lib/supabase/server.ts` (menggunakan `@supabase/ssr` dengan penanganan cookie aman).
   - `lib/supabase/client.ts` (browser client).
   - `lib/supabase/admin.ts` (service-role client untuk operasi latar belakang terisolasi).
3. Menyiapkan helper Redis client (`lib/redis/client.ts`) untuk sliding window rate-limiting.
4. Menyiapkan Engine Adapter Client (`lib/engine/client.ts`) untuk memanggil Private Engine API dengan header `x-engine-secret`.
5. Mengonfigurasi Tailwind CSS dengan tema visual Xevo:
   - Background: `#080607`
   - Panels: `#14090b` / `#1d0b0e`
   - Borders: `#64151d`
   - Primary Accent: `#e50914` / `#ff3340` (Spider Red)
   - Fonts: Inter & Space Mono
6. Membuat komponen dasar UI:
   - `Button`, `Card`, `Badge`, `Input`, `Navbar`, `Sidebar`, `UserNav`.
7. Menyiapkan file `.env.example` dengan dokumentasi seluruh variabel yang dibutuhkan tanpa memuat nilai rahasia.
8. Menulis unit test dasar untuk adapter Engine dan schema validator.

### Yang Tidak Dikerjakan:
- Belum membangun flow pairing live ke nomor riil (dijadwalkan di Phase 5).
- Belum membuat halaman admin operasional penuh (dijadwalkan di Phase 6).
- Tidak mengubah runtime WhatsApp Engine yang sudah stabil.

---

## D. Proposed Changes (Struktur Direktori Web)

| Path File / Folder | Action | Deskripsi Komponen |
|---|---|---|
| `web/` (atau Next.js root) | **Create** | Direktori Next.js App Router lengkap dengan TypeScript. |
| `web/src/app/layout.tsx` | **Create** | Root Layout dengan font Space Mono & Inter, tema dark Spider Red. |
| `web/src/app/(auth)/login/page.tsx` | **Create** | Halaman Login berbasis Supabase Auth. |
| `web/src/app/(auth)/register/page.tsx`| **Create** | Halaman Register akun baru. |
| `web/src/app/(dashboard)/layout.tsx` | **Create** | Dashboard Shell (Sidebar + Navbar + Content Area responsif). |
| `web/src/app/(dashboard)/dashboard/page.tsx` | **Create** | Dashboard Landing (Overview status Engine & sesi). |
| `web/src/lib/supabase/` | **Create** | Supabase SSR Server & Browser clients. |
| `web/src/lib/engine/client.ts` | **Create** | Adapter HTTP client ke WhatsApp Engine internal. |
| `web/src/lib/redis/rate-limit.ts` | **Create** | Helper rate limiter menggunakan Redis. |
| `.env.example` | **Create** | Template konfigurasi environment. |

---

## E. Implementation Steps

1. **Step 1 — Inisialisasi Next.js Project:**
   - Setup project Next.js dengan App Router, TypeScript, ESLint, dan Tailwind CSS.
2. **Step 2 — Integrasi Supabase SSR & Auth Helper:**
   - Pasang `@supabase/supabase-js` dan `@supabase/ssr`.
   - Setup middleware Next.js untuk proteksi route `/(dashboard)/*`.
3. **Step 3 — Styling & Design Tokens:**
   - Konfigurasi `tailwind.config.ts` dengan warna dan shadow khas Xevo 3D brutalist.
4. **Step 4 — Engine Adapter & Redis Limiter:**
   - Buat class `EngineClient` dengan fetch timeout, error mapping, dan header signing.
5. **Step 5 — Testing Foundation & Environment Template:**
   - Verifikasi build `npm run build` di Next.js.
   - Sediakan `.env.example`.

---

## F. Data/Environment Changes

- Template `.env.example` akan mencakup:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ENGINE_INTERNAL_URL=http://127.0.0.1:5004
  ENGINE_INTERNAL_SECRET=xevo_engine_secret_key_2026
  REDIS_URL=redis://localhost:6379
  ```

---

## G. Risks & Impact

- **Struktur Workspace:** Penempatan Next.js harus rapi agar tidak bentrok dengan `package.json` milik WhatsApp Engine. Rekomendasi: Sub-direktori `web/` atau monorepo terorganisir.
- **Client Security:** Service Role Key Supabase dan Engine Secret dipastikan hanya ada di Server Components / Route Handlers, tidak pernah di-bundle ke browser client.

---

## H. Tests Plan

- [ ] **Next.js Build Test:** `npm run build` sukses tanpa TypeScript error.
- [ ] **Design Token Verification:** Komponen Button dan Card merender warna Spider Red dan hard shadow sesuai referensi visual Xevo.
- [ ] **Engine Adapter Unit Test:** Pemanggilan `engineClient.getHealth()` menerima respons dari Engine port 5004 dengan header secret yang valid.
- [ ] **Route Protection Test:** Mengakses `/dashboard` tanpa auth otomatis di-redirect ke `/login`.

---

## I. Rollback

- Direktori `web/` dapat dihapus atau di-revert ke commit Git sebelumnya tanpa memengaruhi Engine.

---

## J. Acceptance Criteria

- [ ] Next.js App Router terkonfigurasi dengan TypeScript dan Tailwind CSS.
- [ ] Supabase Auth SSR bekerja (Server & Browser client terpisah aman).
- [ ] Engine adapter dapat berkomunikasi ke port 5004 dengan `x-engine-secret`.
- [ ] Design tokens mencerminkan tema visual Xevo Spider Red.
- [ ] Route `/dashboard` terproteksi autentikasi.
- [ ] `.env.example` tersedia tanpa ada secret nyata yang bocor.

---

## K. Decisions Needed

1. **Pilihan Struktur Direktori:**
   Apakah Anda setuju meletakkan project Next.js di dalam subfolder **`web/`** (sehingga backend Engine tetap bersih di root), atau ingin pola workspace monorepo? *(Rekomendasi: Subfolder `web/` sangat bersih, modular, dan memisahkan dependencies frontend dari Baileys).*

---

## L. Approval Request

Rencana Phase 4 telah siap. Untuk menyetujui pembangunan **Phase 4 (Web Foundation)**, silakan kirim:

`APPROVE PHASE-4`
