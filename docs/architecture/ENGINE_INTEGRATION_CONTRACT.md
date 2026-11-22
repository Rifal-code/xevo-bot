# ENGINE INTEGRATION CONTRACT

> **Dokumen:** `docs/architecture/ENGINE_INTEGRATION_CONTRACT.md`  
> **Versi:** 1.0  
> **Status:** Architecture Reference (Phase 3)  
> **Target:** Kontrak Komunikasi Next.js ↔ WhatsApp Engine & Browser ↔ Next.js

---

## 1. Standar Format Komunikasi & Headers

### 1.1 Headers Otentikasi Internal (Next.js ➔ Engine)
Setiap request dari Next.js ke WhatsApp Engine wajib menyertakan headers berikut:

| Header | Tipe | Wajib | Contoh / Keterangan |
|---|---|---|---|
| `x-engine-secret` | String | **Ya** | Kunci rahasia bersama (`ENGINE_INTERNAL_SECRET`) |
| `x-correlation-id` | UUID | **Ya** | ID unik per request untuk tracing log (`c8a91b24-...`) |
| `x-tenant-id` | UUID | **Ya** | `user_id` dari Supabase Auth pemilik sesi |
| `Content-Type` | String | **Ya** | `application/json; charset=utf-8` |

### 1.2 Format Respon Standar (Standard JSON Envelope)

**Format Sukses:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": 1774310400000,
    "correlationId": "c8a91b24-9b2d-4e96-a1b7-9c98a58e0a12"
  }
}
```

**Format Error:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PHONE_NUMBER",
    "message": "Nomor WhatsApp tidak valid. Gunakan format internasional (contoh: 628xxxxxxxxxx).",
    "details": null
  },
  "meta": {
    "timestamp": 1774310400000,
    "correlationId": "c8a91b24-9b2d-4e96-a1b7-9c98a58e0a12"
  }
}
```

---

## 2. Spesifikasi Endpoint Private Engine (Internal Node.js Engine)

Base URL: `http://127.0.0.1:5004` (Terikat hanya pada loopback / private network).

### 2.1 `POST /internal/sessions/pair`
Meminta pembuatan sesi baru dan menghasilkan pairing code 8 karakter.

- **Headers:** `x-engine-secret`, `x-correlation-id`, `x-tenant-id`
- **Request Body (Zod Validated):**
```json
{
  "phoneNumber": "6281234567890",
  "clientName": "XEVOBOT"
}
```
- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "data": {
    "pairingCode": "A1B2-C3D4",
    "phoneNumber": "6281234567890",
    "engineSessionRef": "6281234567890",
    "expiresInSeconds": 120
  }
}
```
- **Error Codes:**
  - `400 BAD_REQUEST`: Nomor tidak valid atau format salah.
  - `401 UNAUTHORIZED`: Secret header salah atau tidak ada.
  - `409 CONFLICT`: Nomor ini sedang dalam proses pairing atau sudah aktif.
  - `503 SERVICE_UNAVAILABLE`: Socket Baileys gagal terhubung ke server WhatsApp.

---

### 2.2 `GET /internal/sessions`
Mengambil seluruh status sesi aktif yang dikelola oleh Engine.

- **Headers:** `x-engine-secret`, `x-correlation-id`
- **Query Params:** `tenantId` (Opsional: memfilter hanya sesi milik user tertentu)
- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "engineSessionRef": "6281234567890",
        "phoneNumber": "6281234567890",
        "tenantId": "d3b07384-d113-4e44-8d96-8eb5c94294d1",
        "connected": true,
        "registered": true,
        "reconnecting": false
      }
    ]
  }
}
```

---

### 2.3 `POST /internal/sessions/:id/disconnect`
Memutus koneksi aktif WhatsApp tanpa menghapus credential auth dari disk.

- **Headers:** `x-engine-secret`, `x-correlation-id`, `x-tenant-id`
- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "data": {
    "engineSessionRef": "6281234567890",
    "status": "disconnected"
  }
}
```

---

### 2.4 `DELETE /internal/sessions/:id`
Memutus koneksi dan menghapus folder auth credential secara permanen dari disk.

- **Headers:** `x-engine-secret`, `x-correlation-id`, `x-tenant-id`
- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "data": {
    "engineSessionRef": "6281234567890",
    "removed": true
  }
}
```

---

### 2.5 `GET /internal/health`
Health check operasional Engine.

- **Headers:** `x-engine-secret`
- **Response Sukses (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptimeSeconds": 1420,
    "activeSessions": 3,
    "memoryUsage": {
      "rssMB": 124,
      "heapUsedMB": 82
    }
  }
}
```

---

## 3. Spesifikasi Next.js Route Handlers (User-Facing API)

Endpoint ini dipanggil oleh browser. Next.js memvalidasi sesi Supabase Auth pengguna, memeriksa RLS, memvalidasi rate-limit di Redis, lalu memanggil Private Engine API.

| Endpoint | Method | Fungsi | Otorisasi |
|---|---|---|---|
| `/api/pairing` | POST | Meminta pairing code untuk nomor pengguna | Wajib Login (User Session) |
| `/api/sessions` | GET | Mengambil daftar sesi milik pengguna yang login | Wajib Login (Filtered by `user_id`) |
| `/api/sessions/:id` | GET | Mengambil detail status sesi milik pengguna | Wajib Login (Ownership Verified) |
| `/api/sessions/:id/disconnect` | POST | Memutus koneksi sesi milik pengguna | Wajib Login (Ownership Verified) |
| `/api/sessions/:id` | DELETE | Menghapus sesi & metadata pengguna | Wajib Login (Ownership Verified) |
| `/api/events` | GET | Streaming Server-Sent Events (SSE) status sesi | Wajib Login (User Session) |

### Format Nomor Telepon di Browser (Masking Policy)
Nomor telepon yang dikembalikan ke browser pada endpoint `/api/sessions` **wajib di-mask** untuk privasi:
- Input: `6281234567890`
- Masked Response: `6281••••7890`

---

## 4. Spesifikasi Rate Limiting & Ephemeral Locks (Redis)

Pencegahan serangan *brute-force* dan duplikasi request menggunakan Redis:

| Kategori | Kunci Redis | Algoritma | Batasan / TTL |
|---|---|---|---|
| **Pairing Request Rate Limit** | `ratelimit:pairing:user:<user_id>` | Token Bucket / Sliding Window | Maksimal **3 request / 10 menit** per user |
| **Pairing IP Rate Limit** | `ratelimit:pairing:ip:<ip_address>` | Sliding Window | Maksimal **10 request / 10 menit** per IP |
| **Pairing Lock (Idempotency)** | `lock:pairing:phone:<phone_hash>` | Distributed Lock (`SET NX EX`) | TTL **120 detik** (mencegah klik ganda saat proses socket) |
| **API General Rate Limit** | `ratelimit:api:user:<user_id>` | Token Bucket | Maksimal **60 request / menit** per user |

---

## 5. Idempotency & Error Handling Strategy

1. **Idempotency Key pada Pairing:** Jika browser mengirimkan ulang nomor yang sama dalam jendela waktu 120 detik saat pairing sebelumnya masih berlangsung, Next.js akan mengembalikan pairing code yang sama dari cache/state Engine tanpa membuat socket baru.
2. **Error Isolation pada Auto-Follow:** Fitur auto-follow channel di Engine terisolasi dalam blok `try...catch`. Jika channel WhatsApp gagal di-follow (misalnya rate limit WhatsApp atau JID tidak ditemukan), error hanya dicatat ke log, dan **koneksi sesi WhatsApp tetap berstatus CONNECTED**.
