# PHASE 6 — ADMIN DAN OPERATIONAL UX PLAN

> **Dokumen:** `docs/plans/PHASE-6-ADMIN-AND-OPERATIONAL-UX.md`  
> **Status:** Menunggu Persetujuan Pemilik Project  
> **Tanggal:** 22 November 2026  
> **Target Approval:** `APPROVE PHASE-6`

---

## A. Objective

Membangun modul antarmuka khusus Administrator dan Operasional Sistem pada Next.js:
1. **Admin Health Overview:** Pemantauan real-time status Engine (Uptime, Memory RSS/Heap, Active Sockets, System Load).
2. **Session & Tenant Monitoring:** Tinjauan jumlah sesi aktif per tenant tanpa mengekspos kredensial atau nomor HP yang tidak di-masking.
3. **Audit Log:** Pencatatan aksi-aksi penting administratif (*role-protected actions*).
4. **Operational Status Messaging:** Pengumuman status pemeliharaan sistem (*maintenance notice*) terpusat.

---

## B. Current Findings & Fondasi yang Sudah Tersedia

1. **Core User Flows Selesai (Phase 5):**
   - Halaman Pairing interaktif dengan countdown 120 detik, display kode 8 digit, dan panduan Linked Devices telah aktif.
   - Halaman Session List dengan aksi Disconnect & Delete telah terhubung ke Engine.
   - Kompilasi produksi `next build` lulus 100% (14 static & dynamic routes).
2. **Kebutuhan Phase 6:**
   - Membangun route `/admin` yang hanya bisa diakses oleh user dengan role `admin`.
   - Mengelompokkan metrik operasional dan kesehatan Engine ke dalam dashboard admin tanpa melanggar privasi pengguna (kredensial raw tetap zero exposure).

---

## C. Scope Phase 6

### Yang Dikerjakan:
1. **Admin Dashboard UI (`/admin`):**
   - Metrik server Engine (Node.js uptime, memory usage, socket load, platform architecture).
   - Ringkasan total pengguna terdaftar dan sesi WhatsApp yang aktif.
   - Tabel administrasi sesi dengan aksi darurat (*Force Disconnect*).
2. **Admin API Route Handlers:**
   - `GET /api/admin/metrics`: Mengambil data metrik Engine secara komprehensif.
   - `GET /api/admin/audit-logs`: Menampilkan log aksi admin.
3. **Role Protection Guard:**
   - Verifikasi role admin di server-side (berdasarkan profil Supabase atau secret key).

### Yang Tidak Dikerjakan:
- Tidak menampilkan kredensial atau isi chat pesan WhatsApp pengguna di dashboard admin.
- Tidak mengubah konfigurasi inti Engine Baileys.

---

## D. Proposed Changes

| Path File | Action | Deskripsi Komponen |
|---|---|---|
| `web/src/app/admin/layout.tsx` | **Create** | Layout khusus halaman Admin dengan proteksi akses dan navigasi ops. |
| `web/src/app/admin/page.tsx` | **Create** | Halaman Admin Overview: Engine Health metrics, total sessions, audit logs. |
| `web/src/app/api/admin/metrics/route.ts` | **Create** | API Handler metrik sistem Engine untuk admin. |

---

## E. Implementation Steps

1. **Step 1 — Admin Metrics API:**
   - Buat endpoint `GET /api/admin/metrics` yang mengambil data detail dari Engine port 5004 dengan header `x-engine-secret`.
2. **Step 2 — Admin Layout & Page:**
   - Bangun UI dashboard admin menggunakan Card brutalist, metrik grafik ringkas, dan tabel log.
3. **Step 3 — Build & Validation:**
   - Jalankan `npm run build --prefix web` untuk memastikan tidak ada error kompilasi.

---

## F. Data/Environment Changes

- Menggunakan tabel `admin_audit_logs` yang telah dirancang pada dokumen `DATABASE_SCHEMA.md`.

---

## G. Risks & Impact

- **Data Privacy:** Sesuai prinsip *Least Privilege*, admin tidak diberi akses melihat nomor unmasked atau data chat pribadi pengguna.

---

## H. Tests Plan

- [ ] **Admin Metrics Test:** Endpoint `/api/admin/metrics` mengembalikan data uptime dan memori sistem secara akurat.
- [ ] **Role Protection Test:** Request tanpa otorisasi admin ditolak `403 Forbidden`.
- [ ] **Production Build Test:** `npm run build --prefix web` berhasil 100%.

---

## I. Rollback

- File di folder `web/src/app/admin` dapat di-revert atau dihapus tanpa memengaruhi flow user biasa.

---

## J. Acceptance Criteria

- [ ] Admin dashboard menampilkan metrik kesehatan Engine secara live.
- [ ] Log audit dapat dilihat oleh admin.
- [ ] Tidak ada kebocoran kredensial atau nomor unmasked.
- [ ] `npm run build --prefix web` lulus tanpa error.

---

## K. Decisions Needed

Tidak ada keputusan yang tertunda.

---

## L. Approval Request

Rencana Phase 6 telah siap. Untuk menyetujui implementasi **Phase 6 (Admin dan Operational UX)**, silakan kirim:

`APPROVE PHASE-6`
