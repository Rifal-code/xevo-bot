"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2, PowerOff, Plus, AlertCircle } from "lucide-react";

interface SessionItem {
  id?: string;
  engineSessionRef: string;
  phoneNumber?: string;
  phoneNumberMasked: string;
  connected: boolean;
  status?: string;
  createdAt?: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal mengambil daftar sesi.");
      }
      setSessions(json.data.sessions || []);
    } catch (err: any) {
      setError(err?.message || "Gagal memuat sesi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDisconnect = async (sessionRef: string) => {
    if (!confirm("Apakah Anda yakin ingin memutuskan koneksi sesi ini?")) return;
    setActionLoading(sessionRef);
    try {
      const res = await fetch(`/api/sessions/${sessionRef}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Gagal memutus sesi");
      await fetchSessions();
    } catch (err: any) {
      alert(err?.message || "Gagal memutus koneksi.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (sessionRef: string) => {
    if (!confirm("PERINGATAN: Menghapus sesi akan menghapus kredensial secara permanen. Lanjutkan?")) return;
    setActionLoading(sessionRef);
    try {
      const res = await fetch(`/api/sessions/${sessionRef}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Gagal menghapus sesi");
      await fetchSessions();
    } catch (err: any) {
      alert(err?.message || "Gagal menghapus sesi.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>Daftar Sesi WhatsApp</span>
            <Badge variant="connected">{sessions.length} SESI</Badge>
          </h1>
          <p className="text-xs font-mono text-xevo-muted mt-1 leading-relaxed">
            Seluruh nomor WhatsApp yang ditautkan ke akun Anda (nomor dimasking untuk privasi)
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchSessions}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin" : ""}`} />
            <span>REFRESH</span>
          </Button>

          <Link href="/dashboard/pairing" className="flex-1 sm:flex-initial">
            <Button size="sm" className="w-full flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>TAMBAH NOMOR</span>
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 sm:p-4 bg-red-950/60 border border-red-800 rounded-xl text-xs font-mono text-red-200 flex items-start sm:items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Session List Grid */}
      {sessions.length === 0 && !loading ? (
        <Card className="text-center py-12 sm:py-16">
          <CardContent className="space-y-4 px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-2xl sm:text-3xl mx-auto">
              📱
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Belum Ada Sesi WhatsApp
            </h3>
            <p className="text-xs font-mono text-xevo-muted max-w-md mx-auto leading-relaxed">
              Anda belum menautkan nomor WhatsApp apapun ke akun ini. Klik tombol di bawah untuk mulai pairing dengan kode 8 digit.
            </p>
            <div className="pt-2">
              <Link href="/dashboard/pairing" className="inline-block w-full sm:w-auto">
                <Button className="w-full sm:w-auto">MULAI PAIRING SEKARANG →</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sessions.map((session, idx) => (
            <Card key={session.engineSessionRef || idx} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold text-xevo-muted">
                    SESI #{String(idx + 1).padStart(2, "0")}
                  </span>
                  <Badge variant={session.connected ? "connected" : "disconnected"}>
                    {session.connected ? "CONNECTED" : "OFFLINE"}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <div className="w-10 h-10 rounded-xl bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-xl shrink-0">
                    📱
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-base font-mono truncate">
                      {session.phoneNumberMasked || session.phoneNumber || session.engineSessionRef}
                    </CardTitle>
                    <CardDescription className="text-xs truncate">
                      {session.connected ? "Siap memproses pesan" : "Koneksi terputus"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="border-t border-xevo-border pt-4 mt-2 flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDisconnect(session.engineSessionRef)}
                  disabled={actionLoading === session.engineSessionRef || !session.connected}
                  className="flex-1 text-[11px] min-h-[42px] touch-manipulation"
                  title="Putus koneksi socket"
                >
                  <PowerOff className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span>PUTUS</span>
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(session.engineSessionRef)}
                  disabled={actionLoading === session.engineSessionRef}
                  className="flex-1 text-[11px] min-h-[42px] touch-manipulation"
                  title="Hapus sesi permanen"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                  <span>HAPUS</span>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
