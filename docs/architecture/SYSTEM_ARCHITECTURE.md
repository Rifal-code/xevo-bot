# SYSTEM ARCHITECTURE — XEVOBOTWA WEB PLATFORM

> **Dokumen:** `docs/architecture/SYSTEM_ARCHITECTURE.md`  
> **Versi:** 1.0  
> **Status:** Architecture Reference (Phase 3)  
> **Target:** Integrasi Next.js Full-Stack Web Platform dengan Node.js WhatsApp Engine

---

## 1. Topologi Sistem & Batas Proses

Platform dirancang dengan memisahkan secara tegas antara **Full-Stack Web Application (Next.js)** dan **Always-On WhatsApp Engine (Node.js)**. 

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Client Layer (Browser Pengguna)"]
        Browser["Web Browser (Desktop / Mobile)<br/>HTTPS + WSS / SSE"]
    end

    subgraph WebLayer ["2. Web Application Layer (Next.js App Router + TypeScript)"]
        UI["React Server / Client Components<br/>(Tailwind CSS + shadcn/ui)"]
        Routes["Next.js Route Handlers<br/>(/api/pairing, /api/sessions, /api/events)"]
        Middleware["Auth & Tenant Middleware<br/>(Supabase Session Validation)"]
        Adapter["Engine Adapter Client<br/>(Private HTTP Client + Secret Signer)"]
        
        UI --> Middleware
        Middleware --> Routes
        Routes --> Adapter
    end

    subgraph DataLayer ["3. Data & Cache Layer"]
        SupabaseAuth["Supabase Auth<br/>(Identity, JWT, Sessions)"]
        SupabaseDB[("Supabase PostgreSQL<br/>- profiles<br/>- whatsapp_sessions<br/>- bot_configurations<br/>- activity_logs<br/>(Row Level Security Enabled)")]
        RedisCache[("Redis Service<br/>- Distributed Rate Limiting<br/>- Temporary Pairing Locks<br/>- Session Pub/Sub / SSE State")]
    end

    subgraph EngineLayer ["4. Standalone WhatsApp Engine (Node.js Service)"]
        EngineAPI["Private Internal API Server<br/>(Port 5004, localhost/VPC only)<br/>Header: x-engine-secret"]
        SessionMgr["Multi-Session Manager<br/>(In-Memory Socket Pool & State)"]
        BaileysCore["@whiskeysockets/baileys Core<br/>(Noise Protocol / WebSocket)"]
        AutoFollow["Channel Auto-Follower<br/>(2 Newsletters on connect)"]
        EncStorage["Local Credentials Storage<br/>(./auth/<session_id>/<br/>Ignored by Git, Private Access)"]
        
        EngineAPI --> SessionMgr
        SessionMgr --> BaileysCore
        SessionMgr --> AutoFollow
        SessionMgr --> EncStorage
    end

    subgraph ExternalNetwork ["5. Jaringan Luar"]
        WAServer["WhatsApp Cloud Edge Servers<br/>(web.whatsapp.com / WebSocket)"]
    end

    Browser <-->|HTTPS / Cookies| UI
    Routes <-->|User & Session Verification| SupabaseAuth
    Routes <-->|Queries with User JWT & RLS| SupabaseDB
    Routes <-->|Token Bucket & Key Locks| RedisCache
    Adapter <-->|Internal HTTP + x-engine-secret| EngineAPI
    BaileysCore <-->|Persistent Encrypted WebSocket| WAServer

    style EngineLayer fill:#1e1e2f,stroke:#6366f1,stroke-width:2px,color:#fff
    style WebLayer fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#fff
    style DataLayer fill:#022c22,stroke:#10b981,stroke-width:2px,color:#fff
    style ClientLayer fill:#18181b,stroke:#a1a1aa,stroke-width:2px,color:#fff
    style ExternalNetwork fill:#052e16,stroke:#22c55e,stroke-width:2px,color:#fff
```

---

## 2. Mengapa Engine Dipisahkan dari Next.js?

> [!IMPORTANT]
> **Keputusan Arsitektur Kritis:** Library Baileys **TIDAK BOLEH** dijalankan di dalam serverless function atau Route Handler Next.js.

Alasan teknis:
1. **Persistent WebSocket Lifecycle:** Baileys mempertahankan koneksi socket aktif 24/7 ke server WhatsApp. Serverless environment (seperti Vercel) mematikan proses setelah request selesai (timeout 10–60 detik), yang akan langsung memutus koneksi WhatsApp.
2. **Memory Socket State:** State kriptografi Noise Protocol dan Signal Protocol disimpan dalam memori proses Node.js.
3. **Resilience & Fault Isolation:** Jika proses WhatsApp Engine mengalami restart atau reconnection socket, aplikasi web Next.js tetap aktif dan dapat diakses pengguna tanpa downtime.
4. **Independent Scaling:** Web layer dapat di-scale secara horizontal di container atau edge, sedangkan Engine berjalan pada dedicated process yang diawasi process supervisor (PM2 / Docker).

---

## 3. Trust Boundary & Autentikasi Service-to-Service

1. **Browser ↔ Next.js:**
   - Komunikasi menggunakan HTTPS.
   - Autentikasi pengguna menggunakan cookie HttpOnly yang diterbitkan oleh Supabase Auth.
   - Browser **TIDAK PERNAH** diizinkan memanggil port Engine (5004) secara langsung.
2. **Next.js ↔ Supabase:**
   - Client-side dan server-side menggunakan User JWT yang otomatis memicu evaluasi **Row Level Security (RLS)** pada PostgreSQL.
   - `SUPABASE_SERVICE_ROLE_KEY` hanya digunakan di server Next.js untuk tugas administratif latar belakang yang diotorisasi.
3. **Next.js ↔ WhatsApp Engine:**
   - Komunikasi dilakukan di jaringan privat (`127.0.0.1` atau private VPC subnet).
   - Setiap request dari Next.js ke Engine wajib menyertakan header:
     - `x-engine-secret: <ENGINE_INTERNAL_SECRET>`
     - `x-correlation-id: <UUID>` (untuk tracing log)
     - `x-tenant-id: <SUPABASE_USER_ID>` (untuk binding kepemilikan sesi)
   - Engine menolak request tanpa secret yang valid (`401 Unauthorized`).

---

## 4. State Machine Siklus Hidup Sesi WhatsApp

```mermaid
stateDiagram-v2
    [*] --> UNPAIRED: Inisialisasi Akun
    UNPAIRED --> PAIRING_REQUESTED: User Request Pairing Code
    PAIRING_REQUESTED --> PAIRING_CODE_DISPLAYED: Engine Terbitkan Kode (Valid 120s)
    
    PAIRING_CODE_DISPLAYED --> TIMEOUT: Kode Kadaluwarsa (120s)
    TIMEOUT --> UNPAIRED: Cleanup Temp Auth Folder
    
    PAIRING_CODE_DISPLAYED --> CONNECTED: User Input Kode di WhatsApp HP
    CONNECTED --> AUTO_FOLLOWING: Event connection.open
    AUTO_FOLLOWING --> ACTIVE: Auto-follow 2 Channel Berhasil / Selesai
    
    ACTIVE --> RECONNECTING: Gangguan Jaringan / Socket Drop
    RECONNECTING --> ACTIVE: Reconnect Berhasil (< 5x retry)
    RECONNECTING --> DISCONNECTED: Gagal Reconnect > 5x
    
    ACTIVE --> LOGGED_OUT: User Unlink via WhatsApp HP
    ACTIVE --> DISCONNECTED: User Klik "Disconnect" di Dashboard Web
    
    DISCONNECTED --> UNPAIRED: User Klik "Hapus Sesi" (Data Auth Dihapus)
    LOGGED_OUT --> UNPAIRED: Cleanup Otomatis
```

---

## 5. Keamanan Credential WhatsApp (Zero Raw Credential Exposure)

1. **Storage Isolation:** File credential WhatsApp (`creds.json`, app-state keys) disimpan secara eksklusif di dalam folder lokal Engine (`./auth/<engine_session_ref>/`).
2. **Pencegahan Kebocoran:**
   - Database Supabase **TIDAK MENYIMPAN** file credential WhatsApp dalam bentuk apapun. Supabase hanya mencatat metadata (ID sesi, nomor yang di-mask, status koneksi, timestamp).
   - Next.js **TIDAK PERNAH** menerima file credential dari Engine.
   - Browser **TIDAK PERNAH** menerima file credential.
   - Folder `./auth/` dimasukkan ke dalam [.gitignore](file:///c:/Users/THINKPAD/Documents/webdev/BOT-WHATSAPP/.gitignore).

---

## 6. Real-Time Communication (Server-Sent Events)

Untuk menggantikan polling 5 detik yang membebani server:
- Next.js menyediakan Route Handler `GET /api/events` menggunakan protokol **Server-Sent Events (SSE)**.
- Saat Engine mendeteksi perubahan status sesi (`connecting`, `open`, `close`, `reconnecting`), Engine mempublikasikan event ke Redis channel atau internal callback Next.js.
- Next.js memfilter event berdasarkan `user_id` yang sedang login dan melakukan push pembaruan status ke browser secara instan.
