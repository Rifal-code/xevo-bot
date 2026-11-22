# PANDUAN PENGGUNAAN LOKAL, FITUR DASHBOARD, & SETUP SUPABASE — PECADO PLATFORM

Panduan ini dibuat secara terstruktur dan mudah dipahami untuk membantu Anda menjalankan project **PECADO (WhatsApp Multi-Session Platform)** di komputer lokal, memahami menu dashboard, serta menyiapkan database Supabase dan Environment Variables (.env).

---

## 1. CARA MENJALANKAN ENGINE & WEB SECARA LOKAL

Project ini terdiri dari 2 bagian yang saling terhubung:
1. **WhatsApp Core Engine** (Node.js + Baileys): Berjalan di port `5004`.
2. **Web Platform** (Next.js 14 App Router): Berjalan di port `3000`.

### Langkah 1: Buka Dua Terminal
Buka 2 jendela terminal (PowerShell / Command Prompt / Git Bash) di folder project: `BOT-WHATSAPP`.

---

### Langkah 2: Jalankan WhatsApp Engine (Terminal 1)
Di terminal pertama, jalankan perintah:

```powershell
node server.js
```

**Tanda Berhasil:**
Terminal akan menampilkan pesan:
```text
🌐 Xevo Dashboard listening on port 5004
ℹ️ Memuat sesi WhatsApp...
```
*(Biarkan terminal ini tetap menyala selama menggunakan bot).*

---

### Langkah 3: Jalankan Web Next.js (Terminal 2)
Di terminal kedua, masuk ke folder `web` dan jalankan mode development:

```powershell
cd web
npm run dev
```

**Tanda Berhasil:**
Terminal akan menampilkan:
```text
▲ Next.js 14.2.35
- Local:        http://localhost:3000
✓ Ready in 1500ms
```

---

### Langkah 4: Buka di Browser
Buka browser Anda dan akses:
- **Landing Page:** [http://localhost:3000](http://localhost:3000)
- **Login:** [http://localhost:3000/login](http://localhost:3000/login)
- **Register:** [http://localhost:3000/register](http://localhost:3000/register)

*(Dalam mode lokal development tanpa Supabase, Anda bisa langsung mengisi nama/email/password sembarang untuk masuk ke dashboard).*

---

## 2. FUNGSI-FUNGSI MENU DI DASHBOARD

Setelah login, Anda akan masuk ke halaman Workspace pengguna. Berikut penjelasan fungsi setiap menu yang ada di sidebar:

### A. Dashboard Overview (`/dashboard`)
- **Engine Status:** Memantau apakah backend Engine di port `5004` sedang Online/Offline dan menampilkan lama waktu proses berjalan (*Uptime*).
- **Sesi Aktif:** Menampilkan jumlah nomor WhatsApp yang sedang terhubung ke sistem.
- **Security Posture:** Status proteksi keamanan sistem (RCE eval/exec dinonaktifkan, Internal Secret Auth aktif).
- **Quick Action:** Tombol cepat untuk langsung memulai penautan nomor baru.

### B. Pair WhatsApp (`/dashboard/pairing`)
- **Fungsi Utama:** Menghubungkan nomor WhatsApp Anda ke server bot menggunakan **Pairing Code 8-Karakter** (tanpa scan QR code kamera).
- **Cara Kerja:**
  1. Pengguna memasukkan nomor WhatsApp internasional (contoh: `628123456789`).
  2. Memberikan centang persetujuan otorisasi nomor.
  3. Klik tombol **DAPATKAN PAIRING CODE**.
  4. Muncul kode 8-digit (misalnya `ABCD-1234`) dengan hitung mundur selama **120 detik**.
  5. Pengguna membuka WhatsApp di HP: **Menu (titik tiga) > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon saja**, lalu masukkan kode 8 digit tersebut.
  6. Sistem otomatis mendeteksi koneksi dan mengalihkan status ke **BERHASIL TERHUBUNG**.

### C. Session List (`/dashboard/sessions`)
- **Fungsi Utama:** Melihat dan mengelola daftar akun WhatsApp milik Anda yang telah terhubung.
- **Fitur Privasi (Masking Nomor):** Nomor telepon tidak ditampilkan utuh untuk keamanan data (misalnya tampil sebagai `6281••••7890`).
- **Aksi Kelola:**
  - **Putus Sesi (Disconnect):** Menutup socket koneksi WhatsApp tanpa menghapus riwayat.
  - **Hapus Sesi (Delete):** Menghapus sesi dan file kredensial dari server secara permanen.

### D. Admin Ops (`/admin`)
- **Fungsi Khusus Administrator:** Panel pengawasan performa server dan keamanan.
- **Fitur:**
  - **Penggunaan RAM Server:** Menampilkan konsumsi memori heap dan RAM (dalam MB dan persentase).
  - **Socket Baileys Pool:** Memantau seluruh socket koneksi WhatsApp yang sedang online.
  - **WhatsApp Session Overseer:** Tabel seluruh sesi pengguna dengan tombol **Disconnect Darurat** jika terdapat sesi bot yang spamming atau bermasalah.
  - **Security Gate Checklist:** Audit kepatuhan standar keamanan PRD (SEC-01 s/d SEC-15).

---

## 3. PANDUAN LENGKAP SETUP DATABASE SUPABASE

Platform PECADO menggunakan **PostgreSQL** dari **Supabase** untuk menyimpan metadata user, sesi, dan log aktivitas secara terisolasi dengan **Row Level Security (RLS)**.

### Langkah 1: Buat Akun & Project di Supabase
1. Buka [https://supabase.com](https://supabase.com) dan login/daftar.
2. Klik tombol **New Project**.
3. Isi:
   - **Name:** `pecado-bot` (atau nama pilihan Anda).
   - **Database Password:** Buat password yang kuat (simpan di tempat aman).
   - **Region:** Pilih yang terdekat dengan Indonesia (misalnya `Singapore [ap-southeast-1]`).
4. Klik **Create new project** dan tunggu 1-2 menit hingga database selesai dibuat.

---

### Langkah 2: Eksekusi SQL Schema & RLS
1. Di dashboard Supabase project Anda, buka menu **SQL Editor** di sidebar kiri (ikon `>_`).
2. Klik **New query**.
3. Buka file [`docs/architecture/DATABASE_SCHEMA.md`](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/docs/architecture/DATABASE_SCHEMA.md) di project Anda, lalu salin seluruh kode SQL DDL (dari bagian CREATE TABLE sampai CREATE POLICY).
4. Tempel (*paste*) ke SQL Editor di Supabase.
5. Klik tombol **RUN** di kanan bawah.

**Hasil yang Diharapkan:**
Tabel-tabel berikut otomatis dibuat dengan RLS aktif:
- `profiles`: Data profil pengguna dan role (`user` / `admin`).
- `whatsapp_sessions`: Metadata sesi nomor terhubung (nomor dimasking, status).
- `bot_configurations`: Pengaturan prefix (`.`), mode publik/self per pengguna.
- `activity_logs`: Riwayat event login, pairing, dan aksi user.
- `admin_audit_logs`: Catatan tindakan administrator.

---

### Langkah 3: Mengambil Kredensial API Supabase
1. Di dashboard Supabase, buka menu **Project Settings** (ikon roda gigi di kiri bawah).
2. Pilih submenu **API**.
3. Di sana Anda akan menemukan:
   - **Project URL:** Contoh: `https://xyzcompany.supabase.co`
   - **anon / public key:** Kunci publik (aman untuk browser).
   - **service_role key:** Kunci rahasia server (rahasia, hanya untuk backend).

---

## 4. PANDUAN PENGISIAN FILE ENVIRONMENT (`.env`)

Terdapat 2 file konfigurasi environment yang digunakan:

### A. File `.env` untuk Engine (di root folder `BOT-WHATSAPP/.env`)
Buat file bernama `.env` di folder utama:

```ini
# Port HTTP Engine WhatsApp
PORT=5004

# Kunci rahasia otentikasi internal antara Web Next.js dan Engine
# Nilai ini HARUS SAMA PERSIS dengan yang ada di web/.env.local
ENGINE_INTERNAL_SECRET=pecado_engine_secret_key_2026

# Nomor WhatsApp Administrator bot (format: 628xxx tanpa tanda +)
OWNER_NUMBER=628123456789

# Otomatis ikuti WhatsApp Channel saat koneksi bot terbuka (true/false)
ENABLE_AUTO_FOLLOW=true

# Lingkungan runtime
NODE_ENV=development
```

---

### B. File `web/.env.local` untuk Web Next.js (di folder `web/.env.local`)
Buat file bernama `.env.local` di dalam folder `web/`:

```ini
# URL koneksi ke WhatsApp Engine internal
ENGINE_INTERNAL_URL=http://127.0.0.1:5004

# Kunci rahasia otentikasi internal (SAMAKAN dengan yang di root .env)
ENGINE_INTERNAL_SECRET=pecado_engine_secret_key_2026

# Kredensial Supabase Anda (diambil dari Langkah 3 di atas)
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Lingkungan runtime
NODE_ENV=development
```

---

## 5. CATATAN PENTING KEAMANAN & PRAKTIK TERBAIK

1. **Kredensial WhatsApp:** Seluruh file session pairing tersimpan secara fisik di folder `auth/<nomor>` di root folder. Folder ini **wajib** dijaga kerahasiaannya dan sudah otomatis diabaikan oleh `.gitignore` agar tidak bocor ke Git.
2. **Jangan Membuka Port 5004 ke Publik:** Saat deploy ke VPS nanti, hanya buka port `80/443` (Nginx) ke publik. Port `5004` hanya boleh diakses oleh Next.js via internal localhost (`127.0.0.1`).
3. **Emergency Disconnect:** Jika ada nomor WhatsApp pengguna yang terindikasi melanggar batas penggunaan atau spam, administrator dapat langsung memutus koneksinya melalui menu **Admin Ops** tanpa perlu mematikan seluruh server.
