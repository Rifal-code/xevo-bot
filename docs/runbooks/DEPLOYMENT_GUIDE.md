# PANDUAN DEPLOYMENT & PRODUCTION RUNBOOK — PECADO WEB PLATFORM

## 1. Ikhtisar Arsitektur Produksi

Platform PECADO dibangun menggunakan arsitektur decoupled (terpisah) dua lapisan demi keamanan dan keandalan maksimal:

1. **Frontend & Application API Layer (Next.js 14 App Router):**
   - Berjalan pada port `3000` (atau managed serverless/container).
   - Menangani UI/UX, autentikasi pengguna, otorisasi role, Row Level Security (RLS), dan rate limiting.
2. **WhatsApp Core Engine Layer (Node.js 22 + Baileys):**
   - Berjalan pada port privat `5004` (hanya mendengarkan localhost `127.0.0.1`).
   - Mengelola pool socket Baileys, multi-session WhatsApp, dan penanganan event message.
   - Tidak pernah terekspos langsung ke internet publik; komunikasi diamankan dengan header `x-engine-secret`.
3. **Database & Storage Layer (PostgreSQL / Supabase):**
   - Menyimpan metadata sesi, profil user, konfigurasi bot, dan log audit.
   - Kredensial autentikasi WhatsApp Baileys disimpan terisolasi di folder lokal server `auth/` (bukan di database metadata).

---

## 2. Prasyarat Server Produksi

- **Sistem Operasi:** Linux Ubuntu 22.04 LTS / 24.04 LTS (atau Debian 12).
- **Hardware Minimum:** 2 vCPU, 2 GB RAM, 25 GB SSD (disarankan 4 GB RAM untuk >20 sesi simultan).
- **Runtime:** Node.js `>=20.x` atau `>=22.x` dan npm.
- **Process Manager:** `pm2` (`npm install -g pm2`).
- **Web Server / Reverse Proxy:** Nginx dengan modul SSL (`certbot`).
- **Database:** Supabase project atau PostgreSQL instance terdedikasi.

---

## 3. Langkah Instalasi Langkah demi Langkah

### Langkah 1: Kloning Repositori & Instalasi Dependensi
```bash
# Clone repository
git clone git@github.com:Rifal-code/xevo-bot.git /opt/pecado-platform
cd /opt/pecado-platform

# Install dependensi Engine
npm ci --omit=dev

# Install dependensi Web & build Next.js
cd web
npm ci
npm run build
cd ..
```

---

### Langkah 2: Setup Database (Supabase / PostgreSQL)
1. Buka konsol SQL Supabase / PostgreSQL Anda.
2. Jalankan seluruh DDL dan policy Row Level Security yang tercantum pada file:
   `docs/architecture/DATABASE_SCHEMA.md`
3. Pastikan tabel-tabel berikut telah tercipta dengan RLS aktif:
   - `profiles`
   - `whatsapp_sessions`
   - `bot_configurations`
   - `activity_logs`
   - `admin_audit_logs`

---

### Langkah 3: Konfigurasi Environment Variables

Buat file environment rahasia di server:

#### A. File `.env` untuk Engine (di root folder `/opt/pecado-platform/.env`):
```ini
PORT=5004
ENGINE_INTERNAL_SECRET=ganti_dengan_token_acak_64_karakter_sangat_kuat
OWNER_NUMBER=628123456789
ENABLE_AUTO_FOLLOW=true
NODE_ENV=production
```

#### B. File `web/.env.production` (di folder `/opt/pecado-platform/web/.env.production`):
```ini
ENGINE_INTERNAL_URL=http://127.0.0.1:5004
ENGINE_INTERNAL_SECRET=ganti_dengan_token_acak_64_karakter_sangat_kuat
NEXT_PUBLIC_SUPABASE_URL=https://proyek-anda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...service_key
NODE_ENV=production
```

> [!CAUTION]
> Pastikan nilai `ENGINE_INTERNAL_SECRET` pada file Engine dan file Web identik! Jangan pernah membagikan nilai token ini ke publik.

---

### Langkah 4: Konfigurasi Process Manager (PM2)

Buat file `ecosystem.config.js` di root `/opt/pecado-platform/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'pecado-engine',
      script: './server.js',
      cwd: '/opt/pecado-platform',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5004,
      },
    },
    {
      name: 'pecado-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/opt/pecado-platform/web',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Jalankan kedua service dengan PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

### Langkah 5: Konfigurasi Nginx Reverse Proxy & Firewall

Konfigurasikan Nginx `/etc/nginx/sites-available/pecado`:

```nginx
server {
    server_name panel.domainanda.com;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proteksi: Blokir akses langsung ke engine port jika tidak sengaja terbuka
    location /internal-engine/ {
        return 403;
    }
}
```

Aktifkan site dan pasang sertifikat SSL:
```bash
sudo ln -s /etc/nginx/sites-available/pecado /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d panel.domainanda.com
```

Konfigurasi firewall UFW:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# Pastikan port 5004 TIDAK dibuka ke publik
sudo ufw enable
```

---

## 4. Runbook Backup & Disaster Recovery (Kredensial WhatsApp)

Kredensial WhatsApp tersimpan di folder `/opt/pecado-platform/auth/`. Kehilangan folder ini akan menyebabkan seluruh sesi WhatsApp terputus dan pengguna harus melakukan pairing ulang.

### A. Skrip Backup Terenkripsi Harian (`/opt/backup-pecado-auth.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/pecado-auth"
DATE=$(date +%Y%m%d_%H%M%S)
PASSPHRASE="kunci_enkripsi_backup_anda_yang_sangat_rahasia"

mkdir -p "$BACKUP_DIR"

# Kompresi dan enkripsi menggunakan AES-256-CBC
tar -czf - -C /opt/pecado-platform auth | openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:"$PASSPHRASE" -out "$BACKUP_DIR/auth_$DATE.tar.gz.enc"

# Simpan cadangan selama 14 hari terakhir
find "$BACKUP_DIR" -type f -name "auth_*.enc" -mtime +14 -delete
```

Jadwalkan di cron (`crontab -e`):
```cron
0 3 * * * /opt/backup-pecado-auth.sh > /dev/null 2>&1
```

### B. Prosedur Restore Kredensial Saat Bencana:
```bash
# Matikan engine terlebih dahulu
pm2 stop pecado-engine

# Dekripsi arsip backup
openssl enc -d -aes-256-cbc -pbkdf2 -pass pass:"kunci_enkripsi_backup_anda_yang_sangat_rahasia" -in /var/backups/pecado-auth/auth_2026xxxx.tar.gz.enc | tar -xzf - -C /opt/pecado-platform

# Nyalakan kembali engine
pm2 start pecado-engine
```

---

## 5. Pengujian & Verifikasi Akhir di Server

Jalankan perintah pengujian kesehatan otomatis:
```bash
# Uji Engine lokal
curl -s -H "x-engine-secret: ganti_dengan_token_acak_64_karakter_sangat_kuat" http://127.0.0.1:5004/api/dashboard-stats

# Uji Web Health API
curl -s https://panel.domainanda.com/api/health
```

Respon yang diharapkan harus mengembalikan status `healthy` dan JSON yang valid.
