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
  memoryUsage?: {
    rssMB: number;
    heapUsedMB: number;
  };
}

export class EngineClient {
  private baseUrl: string;
  private secret: string;

  constructor() {
    this.baseUrl = process.env.ENGINE_INTERNAL_URL || "http://127.0.0.1:5004";
    this.secret = process.env.ENGINE_INTERNAL_SECRET || "xevo_engine_secret_key_2026";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(options.headers);
    headers.set("x-engine-secret", this.secret);
    headers.set("Content-Type", "application/json");

    const res = await fetch(url, {
      ...options,
      headers,
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(
        json?.message ||
          json?.error?.message ||
          `Engine request ke ${path} gagal dengan status HTTP ${res.status}`
      );
    }

    return json as T;
  }

  async getHealth(): Promise<EngineHealth> {
    const res = await this.request<{
      success: boolean;
      total?: number;
      connected?: number;
      uptime?: number;
      load?: number;
    }>("/api/dashboard-stats");

    return {
      status: "healthy",
      uptimeSeconds: res.uptime || 0,
      activeSessions: res.total || 0,
    };
  }

  async getSessions(): Promise<EngineSession[]> {
    const res = await this.request<{
      success: boolean;
      sessions?: Array<{ number: string; connected: boolean; registered: boolean }>;
    }>("/api/sessions");

    return (res.sessions || []).map((s) => ({
      engineSessionRef: s.number,
      phoneNumber: s.number,
      connected: !!s.connected,
      registered: !!s.registered,
      reconnecting: false,
    }));
  }

  async requestPairing(phoneNumber: string): Promise<{ code: string; number: string }> {
    const res = await this.request<{
      success: boolean;
      code: string;
      number: string;
    }>("/api/pairing", {
      method: "POST",
      body: JSON.stringify({ number: phoneNumber }),
    });

    return { code: res.code, number: res.number };
  }
}

export const engineClient = new EngineClient();
