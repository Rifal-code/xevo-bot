# PHASE 3 — INTEGRATION CONTRACT & SYSTEM ARCHITECTURE PLAN

> **Dokumen:** `docs/plans/PHASE-3-INTEGRATION-AND-ARCHITECTURE.md`  
> **Status:** Menunggu Persetujuan Pemilik Project  
> **Tanggal:** 22 November 2026  
> **Target Approval:** `APPROVE PHASE-3`

---

## A. Objective

Merancang kontrak integrasi formal, arsitektur sistem menyeluruh, skema database Supabase PostgreSQL (beserta Row Level Security), spesifikasi Redis rate limiting, dan protokol komunikasi antara **Next.js Full-stack Web Platform** dan **Standalone Node.js WhatsApp Engine**.

---

## B. Current Findings & Fondasi yang Sudah Tersedia

1. **Engine Runtime & Security Lulus (Phase 1 & 2):**
   - Engine dapat diinstal dan dijalankan secara reproducible (`npm ci`, Node.js >= 20.0.0).
   - Seluruh celah RCE (`eval`, `exec`) telah dihapus total.
   - Endpoint Engine telah diproteksi dengan header `x-engine-secret`.
   - Auto-follow 2 channel tetap aktif pada `connection === 'open'`.
2. **Kebutuhan Web Platform Baru:**
   - Frontend lama (`index.html`) bersifat monolitik dan menyimpan data ke file JSON lokal tanpa multi-tenant.
   - Web platform baru akan menggunakan **Next.js App Router + TypeScript**, **Supabase Auth & PostgreSQL**, serta **Redis**.
   - Diperlukan kontrak data resmi agar Next.js dan Engine dapat bertukar status sesi dan instruksi pairing secara aman tanpa membocorkan kredensial WhatsApp.

---

## C. Scope Phase 3

### Yang Dikerjakan:
1. Menyusun dokumen arsitektur sistem menyeluruh (`docs/architecture/SYSTEM_ARCHITECTURE.md`).
2. Menyusun dokumen kontrak API internal Next.js ↔ Engine (`docs/architecture/ENGINE_INTEGRATION_CONTRACT.md`), mencakup endpoint internal, format request/response, correlation ID, error handling, dan SSE/status update.
3. Menyusun dokumen skema database Supabase PostgreSQL (`docs/architecture/DATABASE_SCHEMA.md`), mencakup definisi tabel (`profiles`, `whatsapp_sessions`, `activity_logs`, `bot_configurations`), relasi, indeks, dan kebijakan RLS (Row Level Security).
4. Merancang pemetaan kepemilikan (*tenant ownership binding*) antara `user_id` Supabase dan sesi WhatsApp di Engine.
5. Merancang mekanisme antrean dan distributed rate-limiting berbasis Redis.

### Yang Tidak Dikerjakan:
- Belum menulis kode frontend Next.js (dimulai pada Phase 4).
- Belum menjalankan migrasi database fisik ke cloud Supabase (disiapkan pada Phase 4).
- Belum menginstal Next.js atau package frontend di workspace.

---

## D. Proposed Changes (Dokumentasi Output Arsitektur)

| File yang Dibuat | Action | Deskripsi Dokumen |
|---|---|---|
| `docs/architecture/SYSTEM_ARCHITECTURE.md` | **Create** | Diagram arsitektur topologi sistem, pemisahan proses Next.js vs WhatsApp Engine, pola komunikasi service-to-service, dan siklus hidup sesi WhatsApp. |
| `docs/architecture/ENGINE_INTEGRATION_CONTRACT.md` | **Create** | Spesifikasi lengkap endpoint private Engine (`/internal/sessions/pair`, `/internal/sessions/:id`, dll), headers otentikasi, format JSON error, idempotency key, dan streaming status SSE. |
| `docs/architecture/DATABASE_SCHEMA.md` | **Create** | DDL SQL PostgreSQL untuk Supabase: tabel `profiles`, `whatsapp_sessions`, `activity_logs`, `bot_configurations`, fungsi trigger otomatis, dan policy RLS teruji. |

---

## E. Implementation Steps

1. **Step 1 — Perancangan System Architecture:**
   - Petakan interaksi Browser ↔ Next.js Route Handlers ↔ WhatsApp Engine ↔ Server WhatsApp.
   - Tetapkan batas keamanan: browser dilarang memanggil Engine secara langsung; kredensial WhatsApp raw tidak pernah keluar dari server Engine.
2. **Step 2 — Perancangan Integration Contract:**
   - Definisikan kontrak API REST internal Engine (`POST /internal/sessions/pair`, `GET /internal/sessions`, `DELETE /internal/sessions/:id`).
   - Definisikan format payload masked phone, expiration pairing code, dan event status `connecting`, `open`, `close`, `reconnecting`.
3. **Step 3 — Perancangan Database Schema & RLS:**
   - Rancang skema multi-tenant dengan foreign key `user_id` terikat ke `auth.users` Supabase.
   - Buat policy RLS: User A hanya dapat membaca dan memodifikasi sesi miliknya sendiri.
4. **Step 4 — Review & Finalisasi:**
   - Periksa kesesuaian dengan PRD dan Master Prompt.

---

## F. Data/Environment Changes

- **Spesifikasi Environment Variables yang Dirancang:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ENGINE_INTERNAL_URL` (contoh: `http://127.0.0.1:5004`)
  - `ENGINE_INTERNAL_SECRET`
  - `REDIS_URL`

---

## G. Risks & Impact

- Tidak ada dampak destruktif ke kode yang sudah berjalan karena fase ini berfokus pada penyusunan dokumen arsitektur dan spesifikasi kontrak teknis sebelum implementasi Next.js dimulai.

---

## H. Tests Plan (Architecture Validation)

- [ ] **Contract Completeness Review:** Memastikan seluruh kebutuhan UI (Pairing, List, Status, Delete) memiliki endpoint pendukung di kontrak API.
- [ ] **RLS SQL Syntax Validation:** Menguji query DDL PostgreSQL dan RLS policy menggunakan linter/syntax validator SQL.
- [ ] **Zero Raw Credential Exposure:** Memastikan kontrak data tidak memiliki field yang membocorkan file auth/secret keys WhatsApp ke Next.js.

---

## I. Rollback

- File arsitektur dapat direvisi atau dikembalikan ke draf sebelumnya tanpa memengaruhi codebase runtime Engine.

---

## J. Acceptance Criteria

- [ ] Dokumen `SYSTEM_ARCHITECTURE.md`, `ENGINE_INTEGRATION_CONTRACT.md`, dan `DATABASE_SCHEMA.md` selesai disusun secara komprehensif.
- [ ] RLS policy menjamin User A terisolasi dari User B secara ketat di level database.
- [ ] Kontrak private API Next.js ↔ Engine terdokumentasi lengkap.
- [ ] Pemilik project menyetujui dokumen arsitektur sebelum coding Next.js dimulai.

---

## K. Decisions Needed

Tidak ada keputusan yang tertunda. Arsitektur mengikuti tech stack wajib (Next.js App Router + Supabase + Redis + Node.js Engine).

---

## L. Approval Request

Rencana Phase 3 telah siap. Untuk menyetujui penyusunan dokumen arsitektur dan kontrak integrasi **Phase 3 (Integration Contract & System Architecture)**, silakan kirim:

`APPROVE PHASE-3`
