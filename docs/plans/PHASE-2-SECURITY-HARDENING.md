# PHASE 2 — ENGINE SECURITY HARDENING PLAN

> **Dokumen:** `docs/plans/PHASE-2-SECURITY-HARDENING.md`  
> **Status:** Menunggu Persetujuan Pemilik Project  
> **Tanggal:** 22 November 2026  
> **Target Approval:** `APPROVE PHASE-2`

---

## A. Objective

Menutup celah keamanan kritis dan tinggi pada WhatsApp Engine dan server HTTP sebelum platform web Next.js dibangun, dengan tetap **mempertahankan fitur auto-follow channel apa adanya (seperti semula)** sesuai instruksi pemilik project.

---

## B. Current Findings (Fakta Kode Sumber)

1. **RCE via `eval()` (SEC-01):**
   - File: [Xevo.js baris 82-96, 276-281, 488-493](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/Xevo.js#L82-L96)
   - Fungsi `executeEval()` mengeksekusi kode JavaScript arbitrary menggunakan Node `eval()`.
2. **RCE via Shell Command `exec()` (SEC-02):**
   - File: [Xevo.js baris 282-293](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/Xevo.js#L282-L293)
   - Karakter prefix `$` mengeksekusi perintah shell Linux/Windows bebas menggunakan `child_process.exec()`.
3. **Endpoint Pairing & Session List Terbuka Publik (SEC-03 & SEC-04):**
   - File: [server.js baris 219-221, 283-297](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/server.js#L219-L221)
   - `POST /api/pairing` dan `GET /api/sessions` tidak memiliki autentikasi. Siapa pun dapat meminta pairing dan melihat nomor terdaftar.
4. **Credential & Database Belum Diabaikan Git (SEC-12):**
   - File: [.gitignore](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/.gitignore)
   - Folder `auth/` dan `database/` belum terdaftar di `.gitignore`.
5. **Privilege Escalation pada Command Mode (SEC-13):**
   - File: [Xevo.js baris 478-486](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/Xevo.js#L478-L486)
   - Perintah `.public` dan `.self` dapat dijalankan oleh sembarang nomor tanpa verifikasi `isCreator(m)`.
6. **Open Redirect / SSRF pada Image Proxy (SEC-15):**
   - File: [server.js baris 241-270](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/server.js#L241-L270)
   - Proxy mengikuti redirect HTTP (301/302) tanpa memvalidasi apakah domain tujuan akhir masih `files.catbox.moe`.
7. **Auto-Follow Channel (Sesuai Arahan Khusus Pemilik):**
   - File: [index.js baris 22-44, 205](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/index.js#L22-L44)
   - **Keputusan Pemilik:** Auto-follow 2 channel tetap aktif secara otomatis saat koneksi terbuka (`connection === 'open'`) tanpa memerlukan prompt persetujuan pengguna.

---

## C. Scope

### Yang Dikerjakan:
1. Menghapus total `executeEval`, command `.eval`, dan shortcut `]>` dari `Xevo.js`.
2. Menghapus total shell command runner `$` dari `Xevo.js`.
3. Membatasi command `.public` dan `.self` di `Xevo.js` hanya untuk creator (`isCreator(m)`).
4. Memproteksi endpoint internal Engine (`/api/pairing`, `/api/sessions`, `/api/dashboard-stats`) menggunakan Service-to-Service Header `x-engine-secret`.
5. Menambahkan `auth/`, `database/`, `.env*`, dan backup files ke `.gitignore`.
6. Memperbaiki image proxy di `server.js` agar memvalidasi hostname redirect secara ketat.
7. Memastikan auto-follow channel tetap berjalan normal tanpa gangguan.

### Yang Tidak Dikerjakan:
- Tidak mengubah logika bisnis command permainan bot (`.dadu`, `.catur`, `.flappy`, dll).
- Tidak mematikan fitur auto-follow channel (dipertahankan seperti semula).
- Tidak membangun UI Next.js (dijadwalkan untuk Phase 3 s/d 5).
- Tidak menghubungkan nomor WhatsApp riil.

---

## D. Proposed Changes

| File | Action | Detail Rencana Perubahan | Alasan Keamanan |
|---|---|---|---|
| `Xevo.js` | **Modify** | 1. Hapus fungsi `executeEval` dan hapus handler `trimmed.startsWith(']>')` & `case 'eval'`.<br>2. Hapus handler `trimmed.startsWith('$')` (shell exec).<br>3. Tambahkan `if (!isCreator(m)) return reply('Khusus creator')` pada `case 'public'` dan `case 'self'`. | Mengeliminasi RCE Kritis (SEC-01, SEC-02) dan mengamankan kontrol mode bot (SEC-13). |
| `server.js` | **Modify** | 1. Tambahkan middleware validasi `ENGINE_INTERNAL_SECRET` pada endpoint sensitif (`/api/pairing`, `/api/sessions`).<br>2. Perbaiki fungsi `proxy()` di handler `/api/image/` agar memvalidasi hostname target setelah redirect. | Menghentikan akses pairing & session publik tanpa otorisasi (SEC-03, SEC-04) serta mencegah SSRF (SEC-15). |
| `.gitignore` | **Modify** | Tambahkan `auth/`, `database/`, `.env`, `.env.*`, `*.tmp`. | Mencegah kebocoran credential WhatsApp dan data pengguna ke repository Git (SEC-12). |
| `index.js` | **Verify/Retain** | Pastikan `autoFollowChannels()` tetap terpanggil saat `connection === 'open'` dengan error-boundary yang aman agar tidak memutus socket. | Menjaga stabilitas fungsi auto-follow sesuai instruksi pemilik project. |

---

## E. Implementation Steps

1. **Step 1 — Hardening `Xevo.js`:**
   - Hapus blok `executeEval`.
   - Hapus parser shell command `$`.
   - Tambahkan guard `isCreator(m)` pada `.public` dan `.self`.
2. **Step 2 — Proteksi API Internal di `server.js`:**
   - Ambil `ENGINE_INTERNAL_SECRET` dari environment variable (dengan fallback aman untuk lokal development).
   - Validasi header `x-engine-secret` atau token pada request `/api/pairing` dan `/api/sessions`.
   - Perbaiki validasi redirect image proxy.
3. **Step 3 — Pembaruan `.gitignore`:**
   - Daftarkan direktori sensitif (`auth/`, `database/`).
4. **Step 4 — Pengujian & Verifikasi:**
   - Jalankan uji eliminasi eval/shell.
   - Jalankan uji penolakan request tanpa secret token.
   - Jalankan uji kelancaran syntax & server boot.

---

## F. Data/Environment Changes

- **Environment Variable:**
  - `ENGINE_INTERNAL_SECRET`: Kunci rahasia untuk otorisasi antara Next.js dan Engine.
- **Git Tracking:**
  - File sesi WhatsApp lokal (`auth/`) dan database JSON lokal (`database/`) tidak akan terlacak oleh Git.

---

## G. Risks & Impact

- **Dampak Pemilik Bot:** Owner tidak lagi bisa menjalankan command shell atau script JS arbitrary lewat chat WhatsApp. Namun sistem terlindungi 100% dari potensi pengambilalihan server (RCE).
- **Dampak Kompatibilitas:** Frontend web lama (`index.html`) yang mengakses `/api/pairing` secara langsung akan memerlukan header token internal jika secret diaktifkan. Hal ini sesuai arsitektur PRD di mana request web nantinya dijembatani oleh Next.js server-side Route Handlers.

---

## H. Tests Plan

- [ ] **Test SEC-01:** Kirim command `]> 1+1` dan `.eval 1+1` -> harus diabaikan / tidak dieksekusi.
- [ ] **Test SEC-02:** Kirim command `$ whoami` -> harus diabaikan / tidak dieksekusi.
- [ ] **Test SEC-03 & 04:** Request `POST /api/pairing` dan `GET /api/sessions` tanpa header secret -> wajib menghasilkan `401 Unauthorized`.
- [ ] **Test SEC-13:** Pengirim non-creator menjalankan `.public` / `.self` -> ditolak dengan notifikasi hak akses.
- [ ] **Test SEC-12:** `git check-ignore auth/creds.json database/web-users.json` -> mengonfirmasi status ignored.
- [ ] **Test Auto-Follow:** Fungsi `autoFollowChannels` tetap terdefinisi dan terpanggil pada koneksi terbuka.

---

## I. Rollback

Jika ada perubahan yang mengganggu jalannya bot, seluruh kode dapat di-revert ke commit/backup Phase 1 menggunakan git checkout.

---

## J. Acceptance Criteria

- [ ] Tidak ada fungsi `eval()` atau `child_process.exec()` yang tersisa di command handler.
- [ ] Endpoint Engine sensitif terlindungi dengan service authentication.
- [ ] Command mode dibatasi role creator.
- [ ] Folder credential diabaikan Git.
- [ ] Fitur auto-follow tetap aktif seperti semula.

---

## K. Decisions Needed

Semua keputusan telah dikonfirmasi oleh pemilik project (auto-follow dibiarkan seperti semula). Tidak ada keputusan tambahan yang diperlukan.

---

## L. Approval Request

Rencana Phase 2 telah siap dieksekusi. Untuk memulai implementasi **Phase 2 (Engine Security Hardening)**, silakan kirim:

`APPROVE PHASE-2`
