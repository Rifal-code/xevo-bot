# RENCANA KERJA PHASE 7: INTEGRATION TESTING, SECURITY QA & GO-LIVE READINESS

## 1. Ringkasan Tujuan

Phase 7 merupakan fase pengujian menyeluruh (End-to-End Integration Testing), validasi keamanan final (Security QA), dan verifikasi kepatuhan arsitektur sebelum sistem dinyatakan siap deploy ke lingkungan produksi.

Fase ini memastikan bahwa:
1. Komunikasi Next.js ↔ Engine aman dari akses luar, dengan secret key yang tidak dapat dibypass.
2. Kebijakan autentikasi multi-tenant terbukti memisahkan data antarpengguna secara absolut (Row Level Security).
3. Penolakan terhadap command RCE (`eval`, `exec`) terverifikasi dengan automated assertion.
4. Auto-follow channel berjalan sesuai preferensi pengguna yang telah ditetapkan.
5. Dokumentasi operasional dan panduan deployment (runbook) tersedia secara lengkap.

---

## 2. Cakupan Pekerjaan (Scope)

### Termasuk:
- **Test Suite 1 (Security Boundary QA):**
  - Uji penolakan akses ke internal engine (`/api/pairing`, `/api/sessions`, `/api/dashboard-stats`) tanpa `x-engine-secret`.
  - Uji eliminasi RCE pada pesan masuk bot (`eval`, `exec`).
  - Uji proteksi file credential WhatsApp dari Git tracking.
- **Test Suite 2 (Multi-Tenant & Data Isolation QA):**
  - Uji pemisahan sesi: User A tidak dapat memutus atau menghapus sesi milik User B.
  - Uji masking nomor pada semua response API publik.
- **Test Suite 3 (End-to-End Workflow QA):**
  - Simulasi alur pairing: User input nomor → Validasi Zod → Request Engine → Generate pairing code 8 karakter → Countdown timer → Polling status.
- **Deployment & Production Runbook:**
  - Pembuatan dokumen panduan deployment PM2 / Docker, environment variables, Supabase schema setup, dan backup restore credentials.

### Tidak Termasuk:
- Menjalankan koneksi nomor WhatsApp fisik sungguhan secara massal pada saat automated tests.
- Mengubah arsitektur inti yang telah disetujui pada Phase 1-6.

---

## 3. Rencana File Baru / Modifikasi

| File | Action | Deskripsi |
|---|---|---|
| `scripts/test-phase-7-qa.js` | **Create** | Script pengujian integrasi otomatis (E2E) mencakup security boundary, rate limiting, masking, dan internal auth. |
| `docs/runbooks/DEPLOYMENT_GUIDE.md` | **Create** | Panduan produksi: setup server Linux/VPS, reverse proxy Nginx, konfigurasi PM2, Supabase env, dan rotasi secret. |
| `docs/reports/PHASE-7-FINAL-VERIFICATION-REPORT.md` | **Create** | Laporan hasil audit final dan kesiapan go-live. |

---

## 4. Approval Gate

Sesuai aturan kerja, pengerjaan Phase 7 tidak akan dimulai sebelum ada persetujuan eksplisit dari pengguna dalam bentuk pesan:

`APPROVE PHASE-7`
