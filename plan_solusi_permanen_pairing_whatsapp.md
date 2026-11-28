# PLAN SOLUSI PERMANEN: PAIRING KODE 8 KARAKTER WHATSAPP

> Dokumen Artifact Plan. **Status: DISETUJUI & DIEKSEKUSI** (approval pengguna diterima, dengan modifikasi: fingerprint `Browsers.ubuntu('Chrome')` dipertahankan). Perubahan kode telah diterapkan sesuai §4.

---

## 1. Ringkasan Eksekutif

- **Gejala:** saat memasukkan kode 8 karakter di WhatsApp HP, layar HP loading lama lalu "Gagal menautkan perangkat".
- **Akar masalah pasti:** library `@whiskeysockets/baileys@6.7.24` yang digunakan proyek ini mengirim **byte nonce yang salah** dalam stanza `companion_hello` (`'0'` = 0x30 alih-alih 0x00), sehingga server WhatsApp menolak penautan dari sisi ponsel. Diperkuat 3 bug sekunder: (1) tidak ada pengecekan `stage` pada notifikasi `link_code_companion_reg` sehingga notifikasi pra-penautan (stage `undefined`) melempar `Boom('Invalid buffer', 400)`; (2) `validateConnection` memilih jalur **login** (bukan registration) setelah reconnect ketika `creds.me` sudah terisi tetapi `registered === false` — menghasilkan 401 dan "meracuni" sesi; (3) `configureSuccessfulPairing` tidak menandai `creds.registered = true`, sehingga handshake penautan tidak pernah benar-benar dianggap selesai.
- **Solusi:** patch minimal dan permanen terhadap Baileys 6.7.24 (4 perubahan baris: nonce, validateConnection branch, stage check, registered=true) yang diterapkan idempoten saat build via skrip `scripts/patch-baileys.js`, ditambah pembersihan logika restart ganda di `index.js`. Fingerprint browser **dipertahankan** `Browsers.ubuntu('Chrome')` sesuai masukan pengguna.
- **Validasi:** log harus menunjukkan urutan `companion_reg primary_hello → pair-success → close 515 → reconnect → open`, dan status dashboard menjadi `connected` dengan perangkat benar-benar muncul di "Perangkat tertaut" di HP.

---

## 2. Bukti & Investigasi

### 2.1 Sumber upstream (bukan spekulasi)

- PR Baileys **#2872** *"fix: pairing code broken by missing notification stage check and wrong nonce value"* — mengidentifikasi 3 bug yang **sama persis** dengan yang ada di 6.7.24:
  1. `link_code_companion_reg` notification dikirim server **dua kali** (setelah `companion_hello` dengan `stage=undefined` dan setelah user memasukkan kode dengan `stage="primary_hello"`). Tanpa pengecekan stage, Baileys membaca field kripto dari notifikasi pertama → `toRequiredBuffer(undefined)` → `Boom('Invalid buffer', 400)`.
  2. Nonce `link_code_pairing_nonce` dikirim sebagai string `'0'` (0x30) padahal WA Web mengirim 1 byte `0x00`. Ponsel menolak pairing.
  3. `validateConnection` menggunakan jalur login ketika `creds.me` sudah ada tetapi `registered === false` (terjadi setelah reconnect sebelum penautan selesai).
- PR juga menetapkan bahwa `configureSuccessfulPairing` harus menandai `registered: true`.
- PR di-port secara independen ke fork `Cosm1cBug/Baileys-X#9` (validasi silang).
- PR #2769 menunjukkan `companion_platform_display` divalidasi server: hanya `Chrome (Windows)` yang terverifikasi diterima; `Chrome (Acme)` → 400 bad-request.

### 2.2 Bukti kode di proyek ini (6.7.24)

File `node_modules/@whiskeysockets/baileys/lib/Socket/socket.js`:
- Baris **402**: `content: '0'` (nonce salah).
- Baris **157**: `if (!creds.me) {` (tidak memperhitungkan `pairingCode && !registered`).

File `node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js`:
- Baris **376–377**: `case 'link_code_companion_reg'` langsung membaca `primary_identity_pub` dan `link_code_pairing_wrapped_primary_ephemeral_pub` tanpa cek `stage`.

File `node_modules/@whiskeysockets/baileys/lib/Utils/validate-connection.js`:
- Baris **162**: `platform: platformNode?.attrs.name` — tidak ada `registered: true`.

### 2.3 Bukti log (docs/log/log-pairing*.json)

- `6285600803744`: notifikasi `link_code_companion_reg` pada 01:01:01, lalu **tidak ada** `pair-success`; 91 detik kemudian 408 lalu 401 → sesi dihapus sebagai `pairing_logged_out`. Pola ini konsisten dengan "ponsel menolak pairing karena nonce salah" + "reconnect saat pairing mengirim login node → 401".
- `6285178224807`: notifikasi pada 00:43:07 → 408/401; percobaan ulang 00:47:12 → `pair-success` pada 00:47:17, namun tidak pernah mencapai `'open'` (build lama belum memiliki restart terjadwal).
- `6281901821027`: `pair-success` 01:09:53 → 86 detik kemudian 401 `logged_out_from_device` (karena tidak ada restart/reconnect yang benar).
- Tidak ada log `companion_reg_refresh` (artinya notifikasi tersebut tidak relevan untuk alur kode; alur kode murni dipatahkan oleh nonce + stage + validateConnection).
- Pesan `⚠️ [Engine unhandledRejection]: Unsupported state or unable to authenticate data` (GCM auth) muncul berulang — konsisten dengan percobaan dekripsi dari notifikasi stage `undefined` yang tidak memiliki field kripto.

### 2.4 Mengapa workaround lama tidak cukup

- `qrTimeout: 300000`, `keepAliveIntervalMs: 45000`, zombie prevention, dan restart terjadwal 2 detik (commit `c19c190`) menangani **gejala**, bukan **penyebab**: server tetap menolak nonce, ponsel tetap menampilkan "Gagal menautkan perangkat". Restart 2 detik juga berisiko memotong `pair-device-sign` yang sedang dikirim dan memicu `conn.end()` ganda (timer duplikat di handler `pair-success` dan `isNewLogin`).

---

## 3. Diagnosa Pasti (Definite)

1. **Root cause primer (penyebab langsung "Gagal menautkan perangkat"):** Baileys 6.7.24 mengirim `link_code_pairing_nonce = '0'` (byte 0x30) dalam `companion_hello`, padahal protokol WhatsApp Web mengharuskan 1 byte `0x00`. Ponsel menolak pairing secara diam-diam. Karena `requestPairingCode()` di 6.7.24 memakai `sendNode` (fire-and-forget), penolakan 400 dari server tidak pernah muncul di log — kode tetap ditampilkan ke pengguna padahal tidak pernah terdaftar di server.
2. **Root cause sekunder (penyebab 408→401 & "satu kegagalan meracuni sesi berikutnya"):** `validateConnection` memilih jalur login saat `creds.me` sudah ada tapi `registered === false` (kondisi yang selalu terpenuhi setelah `requestPairingCode()` dipanggil). Reconnect yang terjadi sebelum penautan selesai (mis. timeout 408) mengirim `generateLoginNode` → server membalas 401 → sesi dihapus sebagai `pairing_logged_out`. Karena `creds.me` juga diset **sebelum** server menerima `companion_hello`, sesi yang gagal "mengaku" sudah memiliki perangkat → semua percobaan berikutnya terkena 401 (`loggedOut`).
3. **Root cause tersier (noise & race):** tidak ada pengecekan `stage` pada `link_code_companion_reg` → notifikasi pra-penautan melempar `Invalid buffer` (unhandled rejection); `configureSuccessfulPairing` tidak menandai `registered = true` → handshake penautan tidak pernah dianggap selesai; timer restart 2 detik ganda (handler `CB:iq,,pair-success` dan `isNewLogin`).
4. **Faktor pendukung (bukan root cause):** fingerprint `Browsers.ubuntu('Chrome')` menghasilkan `companion_platform_display = 'Chrome (Ubuntu)'`. Bukti log menunjukkan `companion_hello` dengan Ubuntu sudah diterima server, sehingga tidak diubah (sesuai masukan pengguna yang khawatir profil Windows memicu Windows Hello). Hardening ke `Chrome (Windows)` (PR #2769) bersifat opsional dan tidak dimasukkan. Versi WA Web (`fetchLatestWaWebVersion`) sudah live dan sinkron; `MultiFileAuthState` sudah memakai mutex per file dan tidak menjadi penyebab.

---

## 4. Solusi Teknis (Minimal Risk, Permanen)

### A. Patch Baileys 6.7.24 (3 perubahan, idempoten)

Diterapkan via skrip baru `scripts/patch-baileys.js` yang dijalankan saat build (Docker) dan `postinstall` (lokal). Patch menarget file terkompilasi di `node_modules/@whiskeysockets/baileys/lib/...`.

| # | File | Baris (6.7.24) | Perubahan | Alasan |
|---|------|----------------|-----------|--------|
| 1 | `lib/Socket/socket.js` | 402 | `'0'` → `Buffer.alloc(1)` | Nonce harus 1 byte 0x00 agar ponsel menerima pairing. |
| 2 | `lib/Socket/socket.js` | 157 | `if (!creds.me)` → `if (!creds.me \|\| (!!creds.pairingCode && !creds.registered))` | Reconnect sebelum penautan selesai harus memakai jalur registration, bukan login. |
| 3 | `lib/Socket/messages-recv.js` | 377 | Tambahkan `if (linkCodeCompanionReg?.attrs?.stage !== 'primary_hello') break;` sebelum membaca field kripto | Notifikasi pra-penautan (stage `undefined`) tidak memiliki field kripto; harus diabaikan. |
| 4 | `lib/Utils/validate-connection.js` | 162 | Tambahkan `registered: true` ke `authUpdate` | `configureSuccessfulPairing` menandai perangkat sebagai terdaftar agar reconnect berikutnya memakai jalur login. |

Skrip patch harus:
- Memverifikasi versi terpasang adalah `6.7.24` (gagal build bila berbeda — mencegah patch diam-diam tidak cocok).
- Idempoten: jika pola sudah berubah (patch terpasang), lewati; jika pola asli tidak ditemukan, gagalkan build dengan pesan jelas.
- Mendukung `--check` untuk verifikasi tanpa menulis (CI/health check).

### B. Pembersihan logika restart di `index.js`

- Hapus timer restart duplikat: pertahankan **satu** sumber (handler `CB:iq,,pair-success` di level WebSocket), hapus timer di handler `isNewLogin`.
- Buat fungsi `schedulePostPairingRestart(session, conn)` yang:
  - Guard dengan `session.restartScheduled` (idempoten).
  - `await session.saveCreds()` **sebelum** memanggil `conn.end()`.
  - Delay **5000 ms** (bukan 2000) agar `pair-device-sign` dan pertukaran pre-key selesai.
  - Dibatalkan (`clearTimeout`) saat `connection === 'open'` atau sesi dihapus.
- Jangan memanggil `conn.end()` dua kali; `closed` flag di Baileys sudah mencegah, tetapi guard eksplisit lebih aman.

### C. Fingerprint browser (`index.js` baris 477) — TIDAK DIUBAH

- **Pertahankan** `browser: Browsers.ubuntu('Chrome')`.
- Alasan: (1) pengguna melaporkan profil Windows dapat memicu prompt Windows Hello pada perangkat penaut; (2) bukti log menunjukkan `companion_hello` dengan Ubuntu sudah diterima server (notifikasi `link_code_companion_reg` muncul), sehingga Ubuntu bukan penyebab kegagalan; (3) akar masalah pasti adalah nonce (lihat §3.1), bukan platform display.
- Hardening `companion_platform_display` ke `Chrome (Windows)` (PR #2769) bersifat opsional dan **tidak** dimasukkan dalam eksekusi ini. Jika diinginkan nanti, dapat dilakukan via patch tambahan pada `socket.js` baris 397 tanpa mengubah `browser[0]`.

### D. Diagnostik (`index.js`)

- Pada listener `CB:notification`, log juga `stage` dan child tags:
  ```
  console.log(`📡 [Pairing WS] Notification received (${number}): type=${type} stage=${stage}`)
  ```
  agar verifikasi stage (undefined vs primary_hello) terlihat di log.

### E. Infrastruktur build

- `package.json`: pin `"@whiskeysockets/baileys": "6.7.24"` (hapus `^`); tambah `"postinstall": "node scripts/patch-baileys.js"` dan `"patch:baileys": "node scripts/patch-baileys.js"`.
- `Dockerfile`: setelah `COPY . .` tambahkan `RUN node scripts/patch-baileys.js`, plus verifikasi `RUN node scripts/patch-baileys.js --check` (gagal build bila patch tidak terpasang).

### F. Hal yang sengaja TIDAK diubah

- `qrTimeout: 300000`, `keepAliveIntervalMs: 45000`, zombie prevention, state tracking UI — sudah benar, dipertahankan.
- Versi WA Web tetap live-fetch (sudah sinkron).
- Tidak upgrade ke Baileys 7.x atau fork (risiko API breaking + build dari source yang memerlukan `git`/`tsc`; tidak perlu karena 6.7.24 + 3 patch sudah cukup).

---

## 5. Rincian File & Baris yang Akan Diubah

### Baru
- `scripts/patch-baileys.js` — skrip patch idempoten + `--check`.

### Dimodifikasi
- `package.json` — pin versi, postinstall, script.
- `Dockerfile` — jalankan patch setelah COPY.
- `index.js`:
  - Baris ~477: **TIDAK diubah** — tetap `Browsers.ubuntu('Chrome')` (lihat §4.C).
  - Baris ~494–499: tambahkan log `stage`.
  - Baris ~500–526: `schedulePostPairingRestart`, await saveCreds, guard, delay 5000ms.
  - Baris ~643–664: hapus timer restart duplikat di `isNewLogin`; cukup set state + await saveCreds.
  - Baris ~666–688: pada `connection === 'open'` clear `session.restartTimer`.
- `node_modules/@whiskeysockets/baileys/lib/Socket/socket.js` (via patch) — baris 157, 402.
- `node_modules/@whiskeysockets/baileys/lib/Socket/messages-recv.js` (via patch) — baris 377.
- `node_modules/@whiskeysockets/baileys/lib/Utils/validate-connection.js` (via patch) — baris 162.

### Tidak diubah
- `server.js`, `lib/msg.js`, `web/...` — tidak perlu.

---

## 6. Metode Validasi & Pengujian

### 6.1 Build-time
1. `npm run patch:baileys` → output "4/4 patches applied (or already applied)".
2. `npm run patch:baileys -- --check` → exit 0; exit 1 bila ada yang tidak terpasang.
3. Docker build berhasil sampai `RUN node scripts/patch-baileys.js --check`.

### 6.2 Runtime (log yang harus muncul, urutan)
```
📡 [Pairing WS] Notification received (NUM): type=link_code_companion_reg stage=undefined   (diabaikan)
📡 [Pairing WS] Notification received (NUM): type=link_code_companion_reg stage=primary_hello
🎉 [Pairing WS] pair-success received (NUM)! Handshake penautan berhasil.
🔄 [Pairing WS] Melakukan post-pairing restart ... (setelah ~5s)
connection=close ... statusCode=515
🔄 [Pairing] ... Menjadwalkan reconnect...
✅ Connected to WhatsApp: NUM
```
- Tidak boleh ada `⚠️ [Engine unhandledRejection]: Unsupported state or unable to authenticate data` selama pairing.
- Tidak boleh ada `CB:failure ... 401` setelah pair-success.

### 6.3 End-to-end
- Generate kode 8 karakter dari dashboard → masukkan ke HP dalam <60 detik → status dashboard `processing` → `connected` → perangkat muncul di daftar "Perangkat tertaut" di HP.
- `creds.json` sesi baru berisi `"registered": true` dan `"me": {"id": "...@s.whatsapp.net"}`.
- Bot benar-benar bisa menerima/mengirim pesan (socket `'open'`).

### 6.4 Negative test
- Putuskan koneksi (restart server) **sebelum** user memasukkan kode → sesi dihapus sebagai `pairing_dropped_before_handshake_*`, **tidak** ada loop 401.
- Putuskan koneksi **setelah** pair-success → reconnect memakai jalur login → `open`.

### 6.5 Caution
- Jangan spam percobaan pairing (rate limit 429, cooldown >15 menit). Tunggu ≥15 menit antar percobaan yang gagal.
- Gunakan nomor yang belum pernah tertaut (atau hapus folder auth lama) untuk pengujian bersih.

---

## 7. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Patch tidak cocok setelah upgrade Baileys | Pin versi `6.7.24`; skrip gagalkan build bila versi berbeda. |
| `conn.end()` memotong `pair-device-sign` | Delay 5s + await saveCreds sebelum end; fallback: biarkan server mengirim 515 (app tetap reconnect pada close). |
| Timer restart ganda | Single source + guard `restartScheduled`. |
| Platform display (`Chrome (Ubuntu)`) tidak diubah | Tidak berisiko: bukti log menunjukkan `companion_hello` dengan Ubuntu diterima server. Hardening ke `Chrome (Windows)` (PR #2769) bersifat opsional. |
| Rate limit server (429) | Tunggu cooldown; pengujian dibatasi. |

---

## 8. Rollback

- Revert commit patch: `git revert` pada perubahan `scripts/`, `package.json`, `Dockerfile`, `index.js`; `npm ci` memulihkan `node_modules` pristine.
- Tidak ada migrasi data; sesi yang sudah tertaut tetap valid.

---

## 9. Persetujuan

Sebelum mengeksekusi perubahan kode di atas, saya meminta approval Anda:

- [ ] Setuju menerapkan patch Baileys + pembersihan restart + fingerprint Windows.
- [ ] Setuju menambahkan skrip `scripts/patch-baileys.js` dan pin versi.
- [ ] (Opsional) Setuju mempertahankan `Browsers.ubuntu('Chrome')` (menolak perubahan fingerprint) — **tidak disarankan**.

Mohon konfirmasi agar saya mulai implementasi.