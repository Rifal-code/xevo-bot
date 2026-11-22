# RESIDUAL RISK REGISTER — XEVOBOTWA

> **Dokumen:** `docs/security/RESIDUAL_RISK_REGISTER.md`  
> **Tanggal:** 22 November 2026  
> **Status:** Active Reference

---

## 1. Pendahuluan

Dokumen ini mencatat risiko residual (risiko yang tersisa setelah remediation Phase 2) yang tidak dapat dihilangkan sepenuhnya karena batasan platform pihak ketiga, sifat pustaka reverse-engineering, atau keputusan bisnis.

---

## 2. Tabel Risiko Tersisa

| No | Kategori | Deskripsi Risiko | Dampak | Mitigasi / Status Penerimaan |
|---|---|---|---|---|
| 1 | **Kebijakan Platform (Terms of Service)** | Penggunaan library reverse engineering Baileys (tidak resmi) berisiko terkena deteksi dan pemblokiran (*banned*) oleh Meta/WhatsApp. | Akun bot atau nomor pengguna dapat diblokir sementara/permanen oleh WhatsApp jika aktivitas terdeteksi sebagai automasi tidak wajar. | **Inherent Platform Risk.** Perlu dicatat dalam disclaimer layanan. Batasi pengiriman pesan massal dan hindari spam. |
| 2 | **Auto-Follow Tanpa Prompt** | Auto-follow 2 channel WhatsApp terjadi otomatis saat pairing tanpa konfirmasi persetujuan di antarmuka web. | Pengguna dapat merasa tidak nyaman jika menyadari akunnya mengikuti channel asing, lalu melakukan unfollow atau memutus (*unlink*) sesi. | **Accepted by Owner.** Dipertahankan sesuai strategi bisnis pemilik project. |
| 3 | **Stabilitas Sesi Baileys (Multi-Device)** | WhatsApp dapat mencabut sesi linked device jika perangkat utama tidak aktif lebih dari 14 hari atau pengguna memilih "Logout from all devices" di HP. | Sesi terputus dan pengguna harus melakukan pairing ulang. | Sistem reconnect otomatis telah disiapkan dengan batasan retry (maksimal 5 kali) untuk menghindari loop tak berujung. |
| 4 | **Penyimpanan Credential Lokal** | Kredensial sesi disimpan di disk lokal `./auth/<nomor>/` dalam bentuk plaintext file JSON. | Jika penyerang mendapatkan akses fisik/SSH ke server VPS, kredensial sesi dapat disalin. | Diabaikan dari Git via `.gitignore`. Pada arsitektur target Phase 3-5, penyimpanan akan dienkripsi at-rest menggunakan kunci simetris AES-256. |

---

> *Catatan: Registrasi risiko ini akan ditinjau ulang secara berkala pada setiap fase pengembangan web platform.*
