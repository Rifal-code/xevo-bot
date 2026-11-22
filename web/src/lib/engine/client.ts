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
      pairing?: number;
      uptime?: number;
      load?: number;
      ramUsed?: number;
      ramTotal?: number;
    }>("/api/dashboard-stats");

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

  async deleteSession(sessionRef: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/sessions/${sessionRef}`, {
      method: "DELETE",
    });
  }

  async disconnectSession(sessionRef: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/sessions/${sessionRef}/disconnect`, {
      method: "POST",
    });
  }

  async reconnectSession(sessionRef: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/sessions/${sessionRef}/reconnect`, {
      method: "POST",
    });
  }
}

export const engineClient = new EngineClient();
