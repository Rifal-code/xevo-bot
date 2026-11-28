"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Copy,
  Check,
  Smartphone,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  Zap,
  Loader2,
  XCircle,
  RotateCcw,
} from "lucide-react";

type PairingStage = "idle" | "waiting" | "processing" | "connected" | "failed";

function PairingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [activeNumber, setActiveNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(240);
  const [pairingStage, setPairingStage] = useState<PairingStage>("idle");
  const [redirectCountdown, setRedirectCountdown] = useState<number>(4);

  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const num = searchParams.get("number");
    if (num && !phoneNumber) {
      setPhoneNumber(num);
    }
  }, [searchParams]);

  // Countdown timer masa berlaku kode — hanya aktif selama status "waiting"
  useEffect(() => {
    if (pairingStage !== "waiting" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPairingStage("failed");
          setError("Waktu memasukkan kode pairing telah habis (kedaluwarsa). Silakan buat kode baru.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingStage, timeLeft]);

  // Polling deteksi status pairing real-time (waiting -> processing -> connected/failed)
  useEffect(() => {
    if (pairingStage !== "waiting" && pairingStage !== "processing") return;
    if (!activeNumber) return;

    let isSubscribed = true;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pairing?number=${encodeURIComponent(activeNumber)}`);
        const json = await res.json();

        if (!isSubscribed) return;

        if (json.success && json.data) {
          const { status, message } = json.data;

          if (status === "processing") {
            setPairingStage("processing");
          } else if (status === "connected") {
            setPairingStage("connected");
            setPairingCode(null);
            toast.success(`WhatsApp +${activeNumber} berhasil terhubung!`);
            clearInterval(pollInterval);
          } else if (status === "failed") {
            setPairingStage("failed");
            setPairingCode(null);
            setError(message || "Gagal menautkan perangkat. Ponsel membatalkan penautan atau koneksi terputus.");
            clearInterval(pollInterval);
          }
        }
      } catch {
        // Silent poll error
      }
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [pairingStage, activeNumber, toast]);

  // Auto redirect countdown saat berhasil terhubung
  useEffect(() => {
    if (pairingStage !== "connected") return;

    redirectTimerRef.current = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
          router.push("/dashboard/sessions");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, [pairingStage, router]);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPairingCode(null);
    setPairingStage("idle");
    setTimeLeft(240);

    let clean = phoneNumber.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    setActiveNumber(clean);

    try {
      const res = await fetch("/api/pairing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Gagal membuat kode pairing.");
      }

      setPairingCode(json.data.pairingCode);
      if (typeof json.data?.expiresInSeconds === "number") {
        setTimeLeft(json.data.expiresInSeconds);
      }
      setPairingStage("waiting");
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memproses pairing.");
      setPairingStage("failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    toast.info("Kode pairing disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    setPairingStage("idle");
    setPairingCode(null);
    setPhoneNumber("");
    setActiveNumber("");
    setTimeLeft(240);
    setError(null);
  };

  const isWorking = pairingStage === "waiting" || pairingStage === "processing";

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
          <span>Pairing WhatsApp</span>
          <Badge variant="pairing">PUBLIC PAIRING</Badge>
        </h1>
        <p className="text-xs font-mono text-xevo-muted mt-1 leading-relaxed">
          Hubungkan nomor WhatsApp Anda ke Engine menggunakan kode pairing 8 karakter tanpa scan QR.
        </p>
      </div>

      {/* Main Pairing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            <Smartphone className="w-5 h-5 text-xevo-red shrink-0" />
            <span>Masukkan Nomor WhatsApp</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Gunakan format internasional, misalnya <b>628xxxxxxxxxx</b> atau format lokal <b>08xxxxxxxxxx</b>.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleGenerateCode} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="628xxxxxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading || isWorking}
                required
                className="text-base font-bold flex-1"
              />
              <Button
                type="submit"
                size="md"
                disabled={loading || isWorking}
                className="w-full sm:w-auto px-6 whitespace-nowrap shrink-0"
              >
                {loading ? "MEMPROSES..." : "GENERATE CODE →"}
              </Button>
            </div>

            {error && pairingStage !== "failed" && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-200 flex items-start sm:items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5 sm:mt-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* 1. SUCCESS NOTIFICATION ALERT — KETIKA BERHASIL TERHUBUNG */}
          {pairingStage === "connected" && (
            <div className="mt-6 p-5 sm:p-7 bg-[#061a10] border-2 border-emerald-500 rounded-2xl text-center space-y-4 shadow-xevo-brutal animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400 shadow-xevo-brutal">
                <CheckCircle2 className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600 text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                  <span>Koneksi Berhasil Terverifikasi</span>
                </div>
                <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  WHATSAPP BERHASIL TERHUBUNG!
                </h3>
                <p className="text-xs sm:text-sm font-mono text-emerald-200/90 max-w-md mx-auto leading-relaxed">
                  Perangkat untuk nomor <b>+{activeNumber || phoneNumber}</b> telah aktif dan terhubung ke WhatsApp Engine. Siap memproses pesan bot!
                </p>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl max-w-sm mx-auto">
                <span className="text-xs font-mono text-emerald-300">
                  Mengalihkan otomatis ke Daftar Sesi dalam{" "}
                  <b className="text-white text-sm underline">{redirectCountdown}s</b>...
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/dashboard/sessions" className="w-full sm:w-auto">
                  <Button
                    size="md"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 font-bold px-6 shadow-xevo-btn"
                  >
                    <span>KE DAFTAR SESI SEKARANG</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleReset}
                  className="w-full sm:w-auto text-xs font-mono"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Tautkan Nomor Lain</span>
                </Button>
              </div>
            </div>
          )}

          {/* 2. FAILED NOTIFICATION ALERT — KETIKA GAGAL MENAUTKAN */}
          {pairingStage === "failed" && (
            <div className="mt-6 p-5 sm:p-7 bg-[#1c080b] border-2 border-red-600 rounded-2xl text-center space-y-4 shadow-xevo-brutal animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-red-950 border-2 border-red-600 flex items-center justify-center mx-auto text-red-400 shadow-xevo-brutal">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-700 text-[11px] font-mono font-bold text-red-300 uppercase tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>Penautan Gagal</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  GAGAL MENAUTKAN PERANGKAT
                </h3>
                <p className="text-xs sm:text-sm font-mono text-red-200/90 max-w-md mx-auto leading-relaxed">
                  {error || "WhatsApp gagal menyelesaikan penautan, koneksi ditutup, atau kode kedaluwarsa. Silakan generate kode baru untuk mencoba lagi."}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center">
                <Button
                  type="button"
                  size="md"
                  onClick={handleReset}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 shadow-xevo-btn"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  <span>GENERATE KODE BARU</span>
                </Button>
              </div>
            </div>
          )}

          {/* 3. PAIRING CODE DISPLAY — SAAT WAITING / SEDANG MEMPROSES MASUK */}
          {pairingCode && isWorking && (
            <div
              className={`mt-6 sm:mt-8 p-4 sm:p-6 rounded-xl shadow-xevo-brutal space-y-4 text-center border-2 transition-all duration-300 ${
                pairingStage === "processing"
                  ? "bg-[#181105] border-amber-500 shadow-amber-950/30"
                  : "bg-[#0c080a] border-xevo-red"
              }`}
            >
              {pairingStage === "processing" ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/70 text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>KODE DITERIMA DI WHATSAPP</span>
                </div>
              ) : (
                <span className="text-[10px] font-mono font-bold text-xevo-muted tracking-widest uppercase">
                  PAIRING CODE ANDA
                </span>
              )}

              <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                <span
                  className={`text-2xl xs:text-3xl sm:text-5xl font-mono font-black tracking-wider sm:tracking-widest select-all break-all transition-colors ${
                    pairingStage === "processing"
                      ? "text-amber-200 selection:bg-amber-600"
                      : "text-white selection:bg-xevo-red"
                  }`}
                >
                  {pairingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-11 h-11 flex items-center justify-center bg-xevo-panel border border-xevo-border rounded-lg text-xevo-text hover:text-white hover:border-xevo-red transition-all touch-manipulation shrink-0"
                  title="Salin kode"
                  aria-label="Salin kode pairing"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-xevo-green" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Status Kondisi */}
              {pairingStage === "processing" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-mono font-bold text-amber-300">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                    <span>Sedang memproses masuk ke WhatsApp...</span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-mono text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Kode pairing telah diterima ponsel. WhatsApp sedang memverifikasi login companion. Harap tunggu sebentar, jangan tutup halaman ini.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-xevo-red animate-ping shrink-0" />
                  <span>Menunggu input kode di WhatsApp HP Anda...</span>
                </div>
              )}

              {/* Kondisi Waktu / Timer */}
              {pairingStage === "processing" ? (
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-mono text-amber-400/90">
                  <Clock className="w-4 h-4 shrink-0 animate-spin text-amber-400" />
                  <span className="text-[11px] sm:text-xs">
                    Memverifikasi handshake login (biasanya butuh 5-10 detik)...
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-mono text-xevo-yellow">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] sm:text-xs">
                    {timeLeft > 0
                      ? `Berlaku selama ${timeLeft} detik`
                      : "Kode telah kedaluwarsa. Silakan generate ulang."}
                  </span>
                </div>
              )}

              {/* Visual Progress Bar */}
              {pairingStage === "processing" ? (
                <div className="w-full bg-amber-950/60 h-2 rounded-full overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 rounded-full animate-pulse w-full" />
                </div>
              ) : (
                <div className="w-full bg-[#1e0e11] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-xevo-red h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 240) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step by Step Instructions Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-xevo-green shrink-0" />
            <span>Panduan Memasukkan Kode di WhatsApp Ponsel</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Ikuti 5 langkah mudah berikut setelah mendapatkan kode di atas:
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ol className="space-y-3.5 text-xs font-mono text-xevo-muted">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold shrink-0 mt-0.5">
                1
              </span>
              <span className="leading-relaxed">
                Buka aplikasi WhatsApp di HP pada nomor yang ingin ditautkan.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold shrink-0 mt-0.5">
                2
              </span>
              <span className="leading-relaxed">
                Ketuk menu titik tiga (Android) atau <b>Setelan / Settings</b> (iOS), lalu pilih <b>Perangkat Tertaut (Linked Devices)</b>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold shrink-0 mt-0.5">
                3
              </span>
              <span className="leading-relaxed">
                Pilih tombol <b>Tautkan Perangkat (Link a Device)</b>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold shrink-0 mt-0.5">
                4
              </span>
              <span className="leading-relaxed">
                Pilih opsi di bagian bawah: <b>Tautkan dengan nomor telepon saja (Link with phone number instead)</b>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold shrink-0 mt-0.5">
                5
              </span>
              <span className="leading-relaxed">
                Masukkan kode pairing 8 karakter yang muncul di atas dan tunggu status berubah menjadi sedang memproses masuk hingga berhasil.
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PairingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-mono text-xs text-xevo-muted">Memuat halaman pairing...</div>}>
      <PairingContent />
    </Suspense>
  );
}
