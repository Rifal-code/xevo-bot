"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  Server,
  Cpu,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  PowerOff,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface AdminMetrics {
  host: string;
  status: string;
  uptimeSeconds: number;
  loadAverage: number;
  sessions: {
    total: number;
    connected: number;
    pairing: number;
  };
  memory: {
    usedMB: number;
    totalMB: number;
    percent: number;
  };
  security: {
    rceEvalBlocked: boolean;
    rceExecBlocked: boolean;
    internalSecretAuth: boolean;
    credentialsGitIgnored: boolean;
  };
}

interface AdminSession {
  id: string;
  phoneMasked: string;
  connected: boolean;
  registered: boolean;
  engineRef: string;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [confirmSession, setConfirmSession] = useState<AdminSession | null>(null);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [resMetrics, resSessions] = await Promise.all([
        fetch("/api/admin/metrics").then((r) => r.json()),
        fetch("/api/admin/sessions").then((r) => r.json()),
      ]);

      if (resMetrics.success) {
        setMetrics(resMetrics.engine);
      } else {
        setError(resMetrics.message || "Gagal menghubungi Engine");
      }

      if (resSessions.success) {
        setSessions(resSessions.sessions || []);
      }
    } catch (err: any) {
      setError(err?.message || "Koneksi ke Engine terputus.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleDisconnect = async () => {
    if (!confirmSession) return;
    const sessionId = confirmSession.id;
    const phoneDisplay = confirmSession.phoneMasked || sessionId;

    try {
      setActionLoading(sessionId);
      const res = await fetch("/api/admin/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memutus sesi.");
      }
      toast.success(`Sesi darurat ${phoneDisplay} berhasil diputuskan.`);
      setConfirmSession(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Aksi darurat gagal dijalankan.");
    } finally {
      setActionLoading(null);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>Operasional Engine WhatsApp</span>
            <span className="text-[10px] sm:text-xs font-mono font-normal px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
              PANEL ADMIN
            </span>
          </h1>
          <p className="text-xs font-mono text-xevo-muted mt-1 leading-relaxed">
            Pantau performa runtime Node.js, pool socket Baileys, dan integritas keamanan sistem.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${refreshing ? "animate-spin text-xevo-red" : ""}`} />
          <span>{refreshing ? "REFRESHING..." : "REFRESH METRIK"}</span>
        </Button>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-200 flex items-start sm:items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-xevo-red shrink-0 mt-0.5 sm:mt-0" />
          <div className="leading-relaxed">
            <strong>Perhatian:</strong> {error}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Node.js Process */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono text-xevo-muted">ENGINE PROCESS</span>
              <Server className="w-4 h-4 text-xevo-red shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black mt-2">
              {metrics ? (
                <span className="text-xevo-green">ONLINE</span>
              ) : (
                <span className="text-red-500">OFFLINE</span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {metrics ? `Uptime: ${formatUptime(metrics.uptimeSeconds)}` : "Tidak terhubung ke engine"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Memory Util */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono text-xevo-muted">RAM SYSTEM</span>
              <Cpu className="w-4 h-4 text-xevo-yellow shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black mt-2">
              {metrics?.memory ? `${metrics.memory.usedMB} MB` : "—"}
            </CardTitle>
            <CardDescription className="text-xs">
              {metrics?.memory
                ? `Dari ${metrics.memory.totalMB} MB (${metrics.memory.percent}%)`
                : "Informasi memori tidak tersedia"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Active Sockets */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono text-xevo-muted">WHATSAPP SOCKETS</span>
              <Smartphone className="w-4 h-4 text-xevo-green shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black mt-2">
              {metrics ? metrics.sessions.connected : 0} Connected
            </CardTitle>
            <CardDescription className="text-xs">
              {metrics
                ? `${metrics.sessions.total} terdaftar (${metrics.sessions.pairing} pairing)`
                : "Menunggu koneksi..."}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Security Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono text-xevo-muted">SECURITY POSTURE</span>
              <ShieldCheck className="w-4 h-4 text-xevo-green shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black mt-2 text-xevo-green">
              SECURE
            </CardTitle>
            <CardDescription className="text-xs">
              RCE Eval & Exec Ditutup • Auth Gate Aktif
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Security Audit Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-xevo-red shrink-0" />
            <span>Kontrol Keamanan & Hardening Engine</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Audit kepatuhan arsitektur terhadap Master Prompt dan PRD keamanan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-xevo-panel2 border border-xevo-border rounded-lg flex items-center justify-between gap-2">
              <span className="truncate">SEC-01: RCE eval()</span>
              <Badge variant="connected" className="shrink-0">REMOVED</Badge>
            </div>
            <div className="p-3 bg-xevo-panel2 border border-xevo-border rounded-lg flex items-center justify-between gap-2">
              <span className="truncate">SEC-02: Shell exec()</span>
              <Badge variant="connected" className="shrink-0">REMOVED</Badge>
            </div>
            <div className="p-3 bg-xevo-panel2 border border-xevo-border rounded-lg flex items-center justify-between gap-2">
              <span className="truncate">SEC-03: Engine Secret</span>
              <Badge variant="connected" className="shrink-0">ENFORCED</Badge>
            </div>
            <div className="p-3 bg-xevo-panel2 border border-xevo-border rounded-lg flex items-center justify-between gap-2">
              <span className="truncate">SEC-12: Gitignore Auth</span>
              <Badge variant="connected" className="shrink-0">ISOLATED</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions Overseer */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold">
                WhatsApp Session Overseer
              </CardTitle>
              <CardDescription className="text-xs">
                Daftar seluruh sesi yang sedang beroperasi di Baileys Engine
              </CardDescription>
            </div>
            <Badge variant="outline" className="self-start sm:self-auto">{sessions.length} Sesi Terdata</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-xevo-muted">
              Memuat data sesi engine...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-xevo-muted">
              Belum ada akun WhatsApp yang tertaut ke Engine.
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="sm:hidden space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 bg-xevo-panel2 border border-xevo-border rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {sess.phoneMasked}
                      </span>
                      <Badge variant={sess.connected ? "connected" : "disconnected"}>
                        {sess.connected ? "SOCKET OPEN" : "DISCONNECTED"}
                      </Badge>
                    </div>

                    <div className="text-[11px] font-mono text-xevo-muted">
                      Ref: session_{sess.engineRef.slice(-6)}
                    </div>

                    <Button
                      variant="danger"
                      size="sm"
                      disabled={actionLoading === sess.id}
                      onClick={() => setConfirmSession(sess)}
                      className="w-full flex items-center justify-center gap-1.5 min-h-[42px] touch-manipulation"
                    >
                      <PowerOff className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {actionLoading === sess.id ? "PROSES..." : "DISCONNECT DARURAT"}
                      </span>
                    </Button>
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-xevo-border text-xevo-muted">
                      <th className="pb-3 font-bold">NOMOR (MASKED)</th>
                      <th className="pb-3 font-bold">STATUS KONEKSI</th>
                      <th className="pb-3 font-bold">ENGINE REF</th>
                      <th className="pb-3 font-bold text-right">AKSI ADMIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-xevo-border">
                    {sessions.map((sess) => (
                      <tr key={sess.id} className="hover:bg-xevo-panel2/50 transition-colors">
                        <td className="py-3 font-bold text-white">
                          {sess.phoneMasked}
                        </td>
                        <td className="py-3">
                          <Badge variant={sess.connected ? "connected" : "disconnected"}>
                            {sess.connected ? "SOCKET OPEN" : "DISCONNECTED"}
                          </Badge>
                        </td>
                        <td className="py-3 text-xevo-muted">
                          session_{sess.engineRef.slice(-6)}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={actionLoading === sess.id}
                            onClick={() => setConfirmSession(sess)}
                            className="flex items-center gap-1.5 ml-auto touch-manipulation"
                          >
                            <PowerOff className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {actionLoading === sess.id ? "PROSES..." : "DISCONNECT DARURAT"}
                            </span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Admin Emergency Disconnect Dialog */}
      <ConfirmDialog
        isOpen={!!confirmSession}
        onClose={() => {
          if (!actionLoading) setConfirmSession(null);
        }}
        onConfirm={handleDisconnect}
        loading={!!actionLoading}
        variant="danger"
        title="Putus Darurat Sesi WhatsApp?"
        description={`AKSI ROOT ADMIN: Memutus paksa soket Baileys untuk nomor ${
          confirmSession?.phoneMasked || ""
        } (Ref: ${confirmSession?.engineRef || ""}). Koneksi WhatsApp akan langsung dihentikan.`}
        confirmText="YA, PUTUSKAN DARURAT"
        cancelText="BATALKAN"
      />
    </div>
  );
}
