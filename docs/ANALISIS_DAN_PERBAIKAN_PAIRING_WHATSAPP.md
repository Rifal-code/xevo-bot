# LAPORAN KOMPREHENSIF: ANALISIS, RIWAYAT PERBAIKAN, DAN LIFECYCLE PAIRING WHATSAPP (XEVO-BOT)

> **Dokumen Referensi Resmi & Audit Teknis**  
> **Target Analisis:** Penautan WhatsApp Multi-Device menggunakan Kode Pairing 8 Karakter (Baileys `@whiskeysockets/baileys`)  
> **Status Repositori:** Terhubung ke `origin` (`Rifal-code/xevo-bot`) & `fork` (`rifala-lab/pecardoo-bot`)

---

## 1. Ringkasan Eksekutif & Deskripsi Masalah

### Gejala Masalah (Symptom):
Banyak pengguna bot melaporkan bahwa proses penautan nomor WhatsApp melalui fitur **Pairing Code** mengalami kegagalan berulang kali:
1. **Loading Muter-Muter di HP:** Setelah pengguna memasukkan kode 8 karakter ke dalam menu *Perangkat Tertaut (Linked Devices)* di aplikasi WhatsApp ponsel, layar ponsel menampilkan indikator *loading/menautkan perangkat* dalam durasi yang sangat lama.
2. **Gagal Menautkan:** Setelah loading lama tersebut, WhatsApp di ponsel memunculkan notifikasi merah: *"Tidak dapat menautkan perangkat"* / *"Gagal menautkan perangkat"*.
3. **Loop di Server:** Pada log server/bot, soket sering kali terputus dengan kode `statusCode: 408` (Request Timeout), terjadi handshake `CB:failure 403`, atau terjadi loop reconnect hingga puluhan kali tanpa pernah mencapai status `connection === 'open'`.

---

## 2. Arsitektur Komponen & Alur Komunikasi Sistem

Proyek ini terdiri dari dua subsistem utama yang saling berinteraksi:

```
[ Frontend: Next.js 14 Web Dashboard ] (Port 3000 / Vercel / Railway)
       │
       │ HTTP / Server Actions (/api/pairing, /api/sessions)
       ▼
[ Backend: Node.js WhatsApp Engine ] (server.js + index.js, Port 5004)
       │
       │ Baileys WebSocket (Noise Handshake Protocol)
       ▼
[ Server WhatsApp Multi-Device (c.whatsapp.net:443 / web.whatsapp.com) ]
       ▲
       │ E2EE QR / Pairing Code Companion Handshake
       │
[ Ponsel Pengguna (WhatsApp Mobile App) ]
```

### Alur Normal Penautan Kode Pairing:
1. **Pengguna Input Nomor di Web:** Frontend mengirim `POST /api/pairing` berisi `{ phoneNumber }`.
2. **Engine Menginisialisasi Sesi:** Engine memanggil `requestPairing(phoneNumber)` di `index.js`. Sesi baru dibuat via `startSession(number, { pendingPairing: true })` dengan `useMultiFileAuthState(authPath)`.
3. **Koneksi WebSocket & Request Code:** Soket Baileys membuka koneksi WebSocket ke WhatsApp. Begitu WebSocket terbuka (`conn.ws.isOpen`), Baileys mengirimkan stanza `<link_code_companion_reg>` berisi identitas kunci publik companion.
4. **WhatsApp Menghasilkan Kode 8 Karakter:** Server WhatsApp mengembalikan kode (misal `Z788-KHLE`) yang diteruskan ke frontend.
5. **Pengguna Input Kode di HP:** Pengguna membuka *WhatsApp HP -> Perangkat Tertaut -> Tautkan dengan nomor telepon saja*, lalu mengetik 8 karakter tersebut.
6. **Handshake Pertukaran Kunci:**
   - WhatsApp HP mengirimkan stanza enkripsi ke server WA.
   - Server WA meneruskan sinyal ke WebSocket bot (`CB:iq,,pair-success` atau event `isNewLogin`).
   - Bot menyimpan pre-keys dan kredensial login (`session.saveCreds()`), lalu menutup soket registrasi sementara (`DisconnectReason.restartRequired: 515`).
   - Bot membuka kembali soket login menggunakan `generateLoginNode(creds.me)`.
7. **Koneksi Terbuka ('open'):** WhatsApp server mengirimkan sinyal `connection: 'open'`. Nomor resmi tertaut dan bot aktif.

---

## 3. Analisis Forensik Log (`log-pairing.json` s/d `log-pairing4.json`)

Berdasarkan analisis langsung pada kumpulan log eksekusi bot di `docs/log/`:

| Indikator Log | Frekuensi Temuan | Makna Teknis |
|---|---|---|
| `statusCode: 408` | 34x pada 1 nomor dalam 23 menit | Soket dimatikan karena timeout (Baileys internal timer atau keep-alive watchdog). |
| `CB:failure: 403` | 38x | Server WhatsApp menolak otorisasi companion node (kunci/token registrasi tidak valid atau hangus). |
| `Timed Out` | 18x | Koneksi WebSocket tidak menerima respons ping/pong dalam interval tertentu. |
| `isNewLogin` / `pair-success` | 0x pada sesi gagal, 1x pada nomor sukses | Pada sesi yang gagal, WhatsApp server **bahkan belum sempat menyelesaikan pertukaran kunci** sebelum soket ditutup atau di-reset. |

### Kasus Nyata: Sesi Zombie Nomor `6287834132207` (`log-pairing4.json`)
- Soket dibuat pukul **08:09:53**.
- Pengguna sedang mengetik kode di ponsel.
- Di detik ke-80 (**08:11:13**), Baileys internal timer secara sepihak menutup soket dengan kode `408`.
- Kode server lama otomatis mencoba melakukan **reconnect**.
- **Fatal Consequence:** Begitu reconnect terjadi, WebSocket baru dibuat dengan Noise keypair baru. Akibatnya, kode 8 karakter yang terpampang di layar HP pengguna **hangus seketika di server WhatsApp**.
- Ketika pengguna selesai menekan tombol enter di HP, WhatsApp menolak kunci karena socket aslinya sudah mati (`CB:failure 403`).
- Bot mengulangi proses reconnect hingga **34 kali berturut-turut** selama 23 menit, membanjiri CPU dan koneksi.

---

## 4. Temuan Akar Masalah Internal Baileys & Sistem

### Akar Masalah 1: Bug Internal `qrTimeout` Baileys Membunuh Soket Pairing Code
Di dalam `node_modules/@whiskeysockets/baileys/lib/Socket/socket.js`, fungsi `genPairQR` dijalankan secara default oleh Baileys sekalipun bot menggunakan metode *Pairing Code*. 
- Secara bawaan, opsi `qrTimeout` bernilai default `20000ms` (20 detik) dengan batas maksimum percobaan 3-4 ref node (~80 detik).
- Setelah 80 detik, Baileys memicu:
  ```javascript
  end(new Boom('QR refs attempts ended', { statusCode: DisconnectReason.timedOut })) // 408
  ```
- Ini membunuh soket pairing tepat sebelum pengguna selesai mengetik kode di WhatsApp ponselnya!

### Akar Masalah 2: Keep-Alive Terlalu Agresif (`keepAliveIntervalMs: 10000`)
Sebelum perbaikan, `keepAliveIntervalMs` diatur ke `10000` (10 detik). Baileys memiliki watchdog `diff > 15000` (15 detik).
Pada soket unauthenticated (saat menunggu kode pairing), server WhatsApp tidak mengirimkan pesan chat atau stanza data rutin. Jeda transmisi data normal sebesar 15 detik langsung dianggap Baileys sebagai `connectionLost` (408).

### Akar Masalah 3: Reconnect Sebelum Handshake Membuat "Zombie Session"
Ketika soket pairing terputus *sebelum* pengguna memasukkan kode (`!session.pairedAt && !registered`):
- Menghubungkan ulang soket (`reconnect`) tidak ada gunanya karena server WhatsApp tidak mengizinkan melanjutkan pairing code lama pada Noise handshake WebSocket baru.
- Reconnect tersebut hanya menciptakan koneksi "zombie" yang terus-menerus ditolak oleh WhatsApp (`CB:failure: 403`).

### Akar Masalah 4: Timeout Gateway Next.js Dashboard
Route handler Next.js secara default memiliki batas waktu eksekusi singkat (10-15s), dan `engineClient.request` memiliki hardcoded timeout `3500ms`.
Saat engine sedang sibuk melakukan WebSocket handshake dengan server WhatsApp, permintaan generate kode dari dashboard dibatalkan sepihak dengan error:
`"This operation was aborted"`.

### Akar Masalah 5: Ketiadaan Feedback Status Real-Time di UI
Di sisi frontend, pengguna hanya melihat countdown statis `Berlaku selama ... detik`.
Ketika pengguna sudah mengetik kode di HP dan proses handshake sedang berlangsung, UI tidak memberikan status *"Sedang memproses masuk..."*. Pengguna yang panik sering kali menekan tombol refresh atau menekan "Generate Code" ulang, yang secara instan menghapus folder auth sesi yang sedang bertukar kunci.

---

## 5. Rincian Seluruh Perubahan Kode yang Telah Diterapkan

Berikut adalah kompilasi file dan baris kode yang telah diperbaiki:

### A. Konfigurasi Timeout & Watchdog di `index.js`
1. **Memperpanjang `qrTimeout` menjadi 5 Menit (300.000 ms):**
   ```javascript
   qrTimeout: 300000, // Cegah Baileys membunuh soket pairing di detik 80 akibat QR refs habis (408)
   ```
2. **Menyesuaikan `keepAliveIntervalMs` menjadi 45 Detik (45.000 ms):**
   ```javascript
   keepAliveIntervalMs: 45000, // Toleran terhadap jeda transmisi data server WhatsApp saat pairing
   ```

### B. Pembersihan Siklus Disconnect & Eliminasi Zombie Reconnect di `index.js`
Dalam handler `connection.update` (`connection === 'close'`):
```javascript
if (session.pendingPairing) {
  if (loggedOut) {
    console.log(`🗑️ Hapus sesi pairing ${number}: loggedOut (401)`)
    await removeSession(number, 'pairing_logged_out')
    return
  }

  // JIKA PUTUS SEBELUM HANDSHAKE:
  // Jangan reconnect! Kode pairing otomatis hangus di server WhatsApp.
  // Hapus sesi secara bersih agar tidak terjadi loop zombie.
  if (!session.pairedAt && !registered) {
    console.log(`⚠️ Sesi pairing ${number} terputus sebelum kode dimasukkan. Menghapus sesi pairing.`)
    await removeSession(number, `pairing_dropped_before_handshake_${statusCode || 'unknown'}`)
    return
  }

  console.log(`🔄 [Pairing] Menjaga sesi ${number} tetap aktif untuk transisi login handshake...`)
}
```

### C. Mekanisme State Tracking Real-time di `index.js` & `server.js`
- Dibuat struktur pelacakan `pairingStatusMap` di memori engine dengan 4 state:
  - `'waiting'`: Kode aktif dibuat, menunggu input kode di HP.
  - `'processing'`: Sinyal `CB:iq,,pair-success` atau `isNewLogin` diterima, kunci pre-key disimpan, bot sedang transisi login.
  - `'connected'`: Socket status `'open'`, penautan 100% sukses.
  - `'failed'`: Socket terputus, timeout, atau penautan ditolak oleh HP.
- Ditambahkan fungsi `getPairingStatus(phoneNumber)` di `index.js` dan diekspos via endpoint HTTP:
  `GET /api/pairing/status?number=...` di `server.js`.

### D. Perbaikan Next.js Gateway di `web/`
1. **Dynamic Timeout Engine Client (`web/src/lib/engine/client.ts`):**
   - Menambahkan metode `getPairingStatus(phoneNumber)`.
   - Menyetel timeout generate pairing code ke `30000ms` (30 detik).
2. **API Route Status Proxy (`web/src/app/api/pairing/route.ts`):**
   - Menambahkan `export const maxDuration = 45;`
   - Menambahkan handler `GET /api/pairing?number=...` yang mengecek status langsung ke engine dan melakukan sinkronisasi otomatis ke tabel Supabase `whatsapp_sessions` saat berstatus `connected`.
3. **UI Interaktif Reaktif (`web/src/app/(dashboard)/dashboard/pairing/page.tsx`):**
   - Mengubah state timer: Saat status menjadi `processing`, countdown dihentikan dan UI menampilkan pesan:  
     `⏳ Sedang memproses masuk ke WhatsApp... Harap tunggu sebentar, jangan tutup halaman ini.`
   - Jika gagal, menampilkan kartu error Brutalist merah beserta tombol `GENERATE KODE BARU`.
   - Jika berhasil, menampilkan kartu hijau konfirmasi sukses dan mengalihkan ke daftar sesi.

---

## 6. Evaluasi Hasil: Apa yang Sudah Teratasi vs Gejala yang Masih Muncul

### Yang Berhasil Diselesaikan:
✅ Eliminasi error `"This operation was aborted"` saat generate kode pairing di dashboard.  
✅ Eliminasi loop zombie reconnect (soket tidak lagi mengulang koneksi 34x saat gagal).  
✅ Soket pairing tidak lagi mati sendiri di detik ke-80 karena `qrTimeout` sudah di-extend ke 5 menit.  
✅ UI web dashboard kini reaktif dan sinkron terhadap tahapan pairing (waiting -> processing -> connected/failed).

### Gejala yang Masih Sering Terjadi di Lapangan:
⚠️ **Saat memasukkan kode ke perangkat penautan di WhatsApp ponsel, masih banyak user yang tetap gagal (load lama muter-muter, lalu akhirnya gagal menautkan perangkat).**

---

## 7. Hipotesis Teknis Lanjutan untuk Analisis Berikutnya

Bagi AI Agent atau teknisi yang akan melanjutkan penyelidikan, berikut area kritis yang perlu dibedah:

1. **WhatsApp Web Version Mismatch:**
   - WhatsApp secara rutin mengupdate revisi protokol Web client (`web.whatsapp.com`).
   - Jika versi Baileys menggunakan versi WA Web yang terlalu usang atau tidak sesuai dengan versi aplikasi WhatsApp di HP pengguna, server WhatsApp akan menggantungkan koneksi registrasi companion (*infinite handshake loop*) lalu mengirim kode 403 atau melepaskan soket.
2. **Protokol Companion Device Sync & Stanza Pre-Key:**
   - Pada pembaruan WhatsApp terkini, setelah menerima `pair-success`, WhatsApp HP membutuhkan respons konfirmasi stanza pre-key tertentu dari bot.
   - Apakah penundaan restart 2000ms (`setTimeout 2000ms`) di `CB:iq,,pair-success` menginterupsi antrean pertukaran prekey E2EE?
3. **Multi-Device Registration Payload (Browser Descriptor):**
   - Konfigurasi `browser: Browsers.ubuntu('Chrome')` di Baileys. Apakah fingerprint descriptor ini ditandai/dibatasi oleh algoritma antispam WhatsApp terbaru?
4. **IP Address & Hosting Environment (Railway / Cloud Datacenter):**
   - Alamat IP dari penyedia cloud (seperti Railway/DigitalOcean/AWS) sering kali masuk dalam kategori *datacenter IP*. WhatsApp menerapkan proteksi ketat (rate limiting / handshake challenge) pada registrasi perangkat baru dari subnet IP datacenter.
5. **MultiFileAuthState Race Conditions:**
   - Apakah operasi penyimpanan `saveCreds()` pada folder file lokal di Windows/Linux mengalami race condition saat Baileys menulis `app-state-sync-key`, `creds.json`, dan pre-keys secara simultan?

---
*Dokumen ini disusun untuk memberikan konteks lengkap tanpa asumsi, agar langkah pemecahan masalah berikutnya dapat dirancang secara presisi dan terukur.*
