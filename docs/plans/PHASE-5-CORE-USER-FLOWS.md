# PHASE 5 — CORE USER FLOWS PLAN

> **Dokumen:** `docs/plans/PHASE-5-CORE-USER-FLOWS.md`  
> **Status:** Menunggu Persetujuan Pemilik Project  
> **Tanggal:** 22 November 2026  
> **Target Approval:** `APPROVE PHASE-5`

---

## A. Objective

Membangun seluruh alur inti pengguna (*Core User Flows*) pada web Next.js:
1. Alur otentikasi interaktif (Register, Login, Session Management, Logout).
2. Form Pairing interaktif dengan countdown kedaluwarsa kode 120 detik dan panduan langkah WhatsApp Linked Devices.
3. Next.js API Route Handlers terproteksi (`POST /api/pairing`, `GET /api/sessions`, `POST /api/sessions/:id/disconnect`, `DELETE /api/sessions/:id`) yang meneruskan request ke Engine private API dengan header `x-engine-secret`.
4. Halaman daftar sesi WhatsApp terikat `user_id` milik pengguna dengan fitur masking nomor (`6281••••7890`), status realtime, disconnect, dan hapus sesi.
5. Halaman riwayat aktivitas (*Activity History*).

---

## B. Current Findings & Fondasi yang Sudah Tersedia

1. **Fondasi Web Telah Siap (Phase 4):**
   - Next.js App Router + TypeScript berhasil dikompilasi (`next build` lulus dengan exit code 0).
   - Design tokens Spider Red Xevo, Card brutalist, Badge status, dan Input UI telah tersedia.
   - `EngineClient` siap memanggil endpoint Engine port 5004 dengan header `x-engine-secret`.
   - Helper Supabase SSR dan in-memory/Redis rate-limiter telah terpasang.
2. **Kebutuhan Phase 5:**
   - Membangun halaman antarmuka pengguna (`/dashboard/pairing`, `/dashboard/sessions`, `/dashboard/activity`).
   - Membangun API Route Handlers di Next.js untuk menjembatani komunikasi browser ke Engine secara aman.

---

## C. Scope Phase 5

### Yang Dikerjakan:
1. **Pairing Flow UI & Engine Bridge:**
   - Halaman `/dashboard/pairing`: Form input nomor, tombol Generate Code, tampilan kode pairing 8 karakter (`A1B2-C3D4`) berukuran besar, countdown timer 120 detik, dan panduan visual langkah-langkah di WhatsApp HP.
   - Route Handler `POST /api/pairing`: Validasi input (Zod), rate limit (3 request/10 menit), pemanggilan Engine `POST /internal/sessions/pair` via `EngineClient`.
2. **Session List & Actions:**
   - Halaman `/dashboard/sessions`: Menampilkan daftar sesi milik user yang sedang login, nomor yang di-masking, badge status (`CONNECTED`, `PAIRING`, `DISCONNECTED`), waktu terhubung, dan tombol aksi (*Disconnect*, *Hapus Sesi*).
   - Route Handlers `GET /api/sessions`, `POST /api/sessions/:id/disconnect`, dan `DELETE /api/sessions/:id`.
3. **Activity Logs:**
   - Halaman `/dashboard/activity`: Menampilkan log riwayat event user (waktu request pairing, sesi terhubung, sesi terputus) tanpa mengekspos rahasia atau pesan chat.
4. **Auto-Follow:**
   - Fitur auto-follow 2 channel tetap aktif di Engine secara otomatis saat pairing sukses tanpa memerlukan prompt persetujuan pengguna.

### Yang Tidak Dikerjakan:
- Belum membangun modul admin analitik sistem penuh (dijadwalkan di Phase 6).
- Tidak menyimpan plaintext credential WhatsApp ke browser maupun database.

---

## D. Proposed Changes

| Path File | Action | Deskripsi Komponen / Endpoint |
|---|---|---|
| `web/src/app/api/pairing/route.ts` | **Create** | API Route Handler: menerima nomor HP, memvalidasi rate limit, memanggil Engine, dan mengembalikan pairing code. |
| `web/src/app/api/sessions/route.ts` | **Create** | API Route Handler: mengembalikan daftar sesi milik user yang login. |
| `web/src/app/api/sessions/[id]/route.ts` | **Create** | API Route Handler: operasi disconnect dan delete session ke Engine. |
| `web/src/app/(dashboard)/dashboard/pairing/page.tsx` | **Create** | Halaman UI Pairing: input nomor, display code 8-karakter, panduan Linked Devices. |
| `web/src/app/(dashboard)/dashboard/sessions/page.tsx`| **Create** | Halaman UI Daftar Sesi: tabel kartu sesi, status, tombol putus & hapus. |
| `web/src/app/(dashboard)/dashboard/activity/page.tsx`| **Create** | Halaman UI Riwayat Aktivitas pengguna. |

---

## E. Implementation Steps

1. **Step 1 — API Route Handlers:**
   - Buat `POST /api/pairing` dengan Zod schema validation.
   - Buat `GET /api/sessions` dan dynamic route `/api/sessions/[id]`.
2. **Step 2 — UI Pairing Page:**
   - Buat form input interaktif dengan masking dan normalisasi format Indonesia (`62`).
   - Implementasikan countdown timer 120s dan auto-refresh status.
3. **Step 3 — UI Sessions & Management:**
   - Buat kartu sesi dengan tombol aksi disconnect dan dialog konfirmasi hapus.
4. **Step 4 — Activity History Page:**
   - Tampilkan timeline aktivitas akun.
5. **Step 5 — Testing & Build Verification:**
   - Jalankan `npm run build --prefix web` untuk memastikan tidak ada type/build errors.

---

## F. Data/Environment Changes

- Tidak ada penambahan environment variable baru (menggunakan `ENGINE_INTERNAL_URL` dan `ENGINE_INTERNAL_SECRET` yang sudah ada).

---

## G. Risks & Impact

- **Pairing Timeout:** Jika pengguna tidak memasukkan kode dalam 120 detik, sesi sementara di Engine akan otomatis dibersihkan (sesuai lifecycle `PAIRING_TIMEOUT_MS`). UI akan menampilkan tombol coba lagi.

---

## H. Tests Plan

- [ ] **Pairing API Validation Test:** Mengirimkan nomor kosong atau karakter non-numerik menghasilkan `400 Bad Request`.
- [ ] **Rate Limit Test:** Mengirimkan request pairing lebih dari 3 kali dalam 10 menit menghasilkan `429 Too Many Requests`.
- [ ] **Pairing Flow Simulation:** Mock request pairing berhasil menerima kode 8 karakter dari Engine.
- [ ] **Session Masking Test:** Sesi yang dikembalikan ke UI ter-masking dengan benar (`6281••••7890`).
- [ ] **Next.js Production Build Test:** `npm run build --prefix web` berhasil 100%.

---

## I. Rollback

- File route dan page Phase 5 dapat di-revert ke commit Phase 4 menggunakan git checkout.

---

## J. Acceptance Criteria

- [ ] Pengguna dapat mengakses halaman `/dashboard/pairing` dan melakukan request pairing code.
- [ ] Kode pairing tampil jelas dengan panduan Linked Devices dan timer.
- [ ] Daftar sesi tampil di `/dashboard/sessions` dengan nomor ter-masking.
- [ ] Sesi dapat diputus atau dihapus oleh pemiliknya.
- [ ] `npm run build --prefix web` lulus tanpa error.

---

## K. Decisions Needed

Tidak ada keputusan yang tertunda.

---

## L. Approval Request

Rencana Phase 5 telah siap. Untuk menyetujui implementasi **Phase 5 (Core User Flows)**, silakan kirim:

`APPROVE PHASE-5`
