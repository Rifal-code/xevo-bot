"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { RefreshCw, Trash2, PowerOff, Plus, AlertCircle, Zap } from "lucide-react";

interface SessionItem {
  id?: string;
  engineSessionRef: string;
  phoneNumber?: string;
  phoneNumberMasked: string;
  connected: boolean;
  status?: string;
  createdAt?: string;
}

interface DialogState {
  isOpen: boolean;
  type: "disconnect" | "delete" | "need_pairing";
  session: SessionItem | null;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const toast = useToast();

  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: "disconnect",
    session: null,
  });

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

  const openDisconnectDialog = (session: SessionItem) => {
    setDialogState({
      isOpen: true,
      type: "disconnect",
      session,
    });
  };

  const openDeleteDialog = (session: SessionItem) => {
    setDialogState({
      isOpen: true,
      type: "delete",
      session,
    });
  };

  const closeDialog = () => {
    if (actionLoading) return;
    setDialogState({
      isOpen: false,
      type: "disconnect",
      session: null,
    });
  };

  const handleReconnect = async (session: SessionItem) => {
    const sessionRef = session.engineSessionRef;
    const phoneDisplay = session.phoneNumberMasked || sessionRef;

    setActionLoading(sessionRef);
    try {
      const res = await fetch(`/api/sessions/${sessionRef}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconnect" }),
      });
      const json = await res.json();

      if (json.needPairing || !res.ok || !json.success) {
        // Kredensial tidak ada di disk (terhapus saat diputus sebelumnya)
        setDialogState({
          isOpen: true,
          type: "need_pairing",
          session,
        });
        return;
      }

      toast.success(`Sesi ${phoneDisplay} berhasil disambungkan kembali!`);
      await fetchSessions();
    } catch (err: any) {
      setDialogState({
        isOpen: true,
        type: "need_pairing",
        session,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!dialogState.session) return;
    const sessionRef = dialogState.session.engineSessionRef;
    const phoneDisplay = dialogState.session.phoneNumberMasked || sessionRef;

    if (dialogState.type === "need_pairing") {
      const targetNum = dialogState.session.engineSessionRef;
      closeDialog();
      router.push(`/dashboard/pairing?number=${targetNum}`);
      return;
    }

    setActionLoading(sessionRef);
    try {
      if (dialogState.type === "disconnect") {
        const res = await fetch(`/api/sessions/${sessionRef}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "disconnect" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || "Gagal memutus sesi");
        toast.success(`Koneksi sesi ${phoneDisplay} berhasil diputuskan.`);
      } else {
        const res = await fetch(`/api/sessions/${sessionRef}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || "Gagal menghapus sesi");
        toast.success(`Sesi ${phoneDisplay} berhasil dihapus secara permanen.`);
      }
      closeDialog();
      await fetchSessions();
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat memproses permintaan.");
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
                {session.connected ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => openDisconnectDialog(session)}
                    disabled={actionLoading === session.engineSessionRef}
                    className="flex-1 text-[11px] min-h-[42px] touch-manipulation"
                    title="Putus koneksi socket"
                  >
                    <PowerOff className="w-3.5 h-3.5 mr-1 shrink-0" />
                    <span>PUTUS</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleReconnect(session)}
                    disabled={actionLoading === session.engineSessionRef}
                    className="flex-1 text-[11px] min-h-[42px] touch-manipulation bg-emerald-700 hover:bg-emerald-600 border-emerald-500 shadow-none hover:shadow-xevo-btn"
                    title="Sambungkan kembali nomor ini"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1 shrink-0" />
                    <span>SAMBUNGKAN</span>
                  </Button>
                )}

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => openDeleteDialog(session)}
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

      {/* Professional Confirmation Modal Dialog */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={handleConfirmAction}
        loading={!!actionLoading}
        variant={
          dialogState.type === "delete"
            ? "danger"
            : dialogState.type === "need_pairing"
            ? "warning"
            : "warning"
        }
        title={
          dialogState.type === "delete"
            ? "Hapus Sesi Secara Permanen?"
            : dialogState.type === "need_pairing"
            ? "Tautkan Ulang WhatsApp?"
            : "Putus Koneksi Sesi WhatsApp?"
        }
        description={
          dialogState.type === "delete"
            ? `PERINGATAN: Kredensial autentikasi WhatsApp untuk nomor ${
                dialogState.session?.phoneNumberMasked || ""
              } akan dihapus secara permanen dari server.`
            : dialogState.type === "need_pairing"
            ? `Sesi untuk nomor ${
                dialogState.session?.phoneNumberMasked || ""
              } sebelumnya telah diputus. Untuk mengaktifkannya kembali, silakan buat kode pairing 8 digit baru.`
            : `Sesi WhatsApp untuk nomor ${
                dialogState.session?.phoneNumberMasked || ""
              } akan diputuskan dari WhatsApp Engine. Nomor ini tidak akan memproses pesan bot sampai disambungkan kembali.`
        }
        confirmText={
          dialogState.type === "delete"
            ? "YA, HAPUS PERMANEN"
            : dialogState.type === "need_pairing"
            ? "BUAT KODE PAIRING →"
            : "YA, PUTUSKAN KONEKSI"
        }
        cancelText="BATAL"
      />
    </div>
  );
}
