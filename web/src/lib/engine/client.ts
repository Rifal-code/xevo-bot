export interface EngineSession {
  engineSessionRef: string;
  phoneNumber: string;
  tenantId?: string;
  connected: boolean;
  registered: boolean;
  reconnecting: boolean;
}

export interface EngineHealth {
  status: string;
  uptimeSeconds: number;
  activeSessions: number;
  connectedSessions: number;
  pairingSessions: number;
  load: number;
  memoryUsage: {
    usedMB: number;
    totalMB: number;
    percent: number;
  };
}

export class EngineClient {
  private baseUrl: string;
  private secret: string;

  constructor() {
    this.baseUrl = process.env.ENGINE_INTERNAL_URL || "http://127.0.0.1:5004";
    this.secret = process.env.ENGINE_INTERNAL_SECRET || "xevo_engine_secret_key_2026";
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    timeoutMs: number = 5000
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);
    headers.set("x-engine-secret", this.secret);
    headers.set("Content-Type", "application/json");

    // Timeout dinamis: pairing code butuh waktu lebih lama (30s), sedangkan health/status butuh respon cepat (3.5s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal,
        headers,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          json?.message ||
            json?.error?.message ||
            `Engine request ke ${path} gagal dengan status HTTP ${res.status}`
        );
      }

      return json as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
        throw new Error(
          `Request ke Engine timeout (${Math.round(timeoutMs / 1000)}s). WhatsApp Engine sedang memproses atau koneksi lambat. Silakan coba lagi.`
        );
      }
      throw err;
    }
  }

  async getHealth(): Promise<EngineHealth> {
    const res = await this.request<{
      success: boolean;
      total?: number;
      connected?: number;
      pairing?: number;
      uptime?: number;
      load?: number;
      ramUsed?: number;
      ramTotal?: number;
    }>("/api/dashboard-stats", {}, 3500);

    const usedBytes = res.ramUsed || 0;
    const totalBytes = res.ramTotal || 1;
    const usedMB = Math.round(usedBytes / (1024 * 1024));
    const totalMB = Math.round(totalBytes / (1024 * 1024));
    const percent = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

    return {
      status: "healthy",
      uptimeSeconds: res.uptime || 0,
      activeSessions: res.total || 0,
      connectedSessions: res.connected || 0,
      pairingSessions: res.pairing || 0,
      load: res.load || 0,
      memoryUsage: {
        usedMB,
        totalMB,
        percent,
      },
    };
  }

  async getSessions(): Promise<EngineSession[]> {
    const res = await this.request<{
      success: boolean;
      sessions?: Array<{ number: string; connected: boolean; registered: boolean }>;
    }>("/api/sessions", {}, 6000);

    return (res.sessions || []).map((s) => ({
      engineSessionRef: s.number,
      phoneNumber: s.number,
      connected: !!s.connected,
      registered: !!s.registered,
      reconnecting: false,
    }));
  }

  async requestPairing(phoneNumber: string): Promise<{ code: string; number: string }> {
    // Generate pairing code membutuhkan koneksi WebSocket ke server WhatsApp (diberikan batas 30 detik)
    const res = await this.request<{
      success: boolean;
      code: string;
      number: string;
    }>(
      "/api/pairing",
      {
        method: "POST",
        body: JSON.stringify({ number: phoneNumber }),
      },
      30000
    );

    return { code: res.code, number: res.number };
  }

  async getPairingStatus(phoneNumber: string): Promise<{
    status: "idle" | "waiting" | "processing" | "connected" | "failed";
    message: string;
    reason?: string;
  }> {
    const res = await this.request<{
      success: boolean;
      status: "idle" | "waiting" | "processing" | "connected" | "failed";
      message?: string;
      reason?: string;
    }>(`/api/pairing/status?number=${encodeURIComponent(phoneNumber)}`, {}, 4000);

    return {
      status: res.status || "idle",
      message: res.message || "",
      reason: res.reason,
    };
  }

  async deleteSession(sessionRef: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/sessions/${sessionRef}`,
      {
        method: "DELETE",
      },
      8000
    );
  }

  async disconnectSession(sessionRef: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/sessions/${sessionRef}/disconnect`,
      {
        method: "POST",
      },
      8000
    );
  }

  async reconnectSession(sessionRef: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/sessions/${sessionRef}/reconnect`,
      {
        method: "POST",
      },
      15000
    );
  }
}

export const engineClient = new EngineClient();
