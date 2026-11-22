"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, QrCode, Smartphone, Clock, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";

export default function PairingPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isSuccess, setIsSuccess] = useState(false);

  // Countdown timer for pairing code validity
  useEffect(() => {
    if (!pairingCode || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingCode, timeLeft]);

  // Poll for connection status once code is displayed
  useEffect(() => {
    if (!pairingCode || isSuccess || timeLeft <= 0) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/sessions");
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.sessions)) {
          const matched = json.data.sessions.find(
            (s: any) => s.connected === true
          );
          if (matched) {
            setIsSuccess(true);
            clearInterval(pollInterval);
          }
        }
      } catch {
        // Silent poll error
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [pairingCode, isSuccess, timeLeft]);

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPairingCode(null);
    setIsSuccess(false);
    setTimeLeft(120);

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
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memproses pairing.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Pairing WhatsApp</span>
          <Badge variant="pairing">PUBLIC PAIRING</Badge>
        </h1>
        <p className="text-xs font-mono text-xevo-muted mt-1">
          Hubungkan nomor WhatsApp Anda ke Engine menggunakan kode pairing 8 karakter tanpa scan QR.
        </p>
      </div>

      {/* Main Pairing Card */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Smartphone className="w-5 h-5 text-xevo-red" />
            <span>Masukkan Nomor WhatsApp</span>
          </CardTitle>
          <CardDescription>
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
                disabled={loading || (!!pairingCode && timeLeft > 0 && !isSuccess)}
                required
                className="text-base font-bold"
              />
              <Button
                type="submit"
                disabled={loading || (!!pairingCode && timeLeft > 0 && !isSuccess)}
                className="whitespace-nowrap sm:w-auto w-full px-6"
              >
                {loading ? "MEMPROSES..." : "GENERATE CODE →"}
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* Success Notification */}
          {isSuccess && (
            <div className="mt-6 p-4 bg-emerald-950/80 border-2 border-emerald-500 rounded-xl text-center space-y-2 animate-bounce">
              <div className="text-2xl">🎉</div>
              <h4 className="text-base font-black text-emerald-300">
                WHATSAPP BERHASIL TERHUBUNG!
              </h4>
              <p className="text-xs font-mono text-emerald-200">
                Sesi Anda kini aktif dan siap menerima perintah bot.
              </p>
              <div className="pt-2">
                <Link href="/dashboard/sessions">
                  <Button size="sm" variant="secondary">
                    LIHAT DAFTAR SESI →
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Pairing Code Display */}
          {pairingCode && !isSuccess && (
            <div className="mt-8 p-6 bg-[#0c080a] border-2 border-xevo-red rounded-xl shadow-xevo-brutal space-y-4 text-center">
              <span className="text-[10px] font-mono font-bold text-xevo-muted tracking-widest uppercase">
                PAIRING CODE ANDA
              </span>

              <div className="flex items-center justify-center gap-4">
                <span className="text-3xl sm:text-5xl font-mono font-black tracking-widest text-white selection:bg-xevo-red">
                  {pairingCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-3 bg-xevo-panel border border-xevo-border rounded-lg text-xevo-text hover:text-white hover:border-xevo-red transition-all"
                  title="Salin kode"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-xevo-green" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Expiry Timer */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-xevo-yellow">
                <Clock className="w-4 h-4" />
                <span>
                  {timeLeft > 0
                    ? `Berlaku selama ${timeLeft} detik`
                    : "Kode telah kedaluwarsa. Silakan generate ulang."}
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-[#1e0e11] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-xevo-red h-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(timeLeft / 120) * 100}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step by Step Instructions Guide */}
      <Card>
        <CardHeader>
          <CardTitle>
            <ShieldCheck className="w-5 h-5 text-xevo-green" />
            <span>Panduan Memasukkan Kode di WhatsApp Ponsel</span>
          </CardTitle>
          <CardDescription>
            Ikuti 5 langkah mudah berikut setelah mendapatkan kode di atas:
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ol className="space-y-3 text-xs font-mono text-xevo-muted">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold flex-shrink-0">
                1
              </span>
              <span>
                Buka aplikasi WhatsApp di HP pada nomor yang ingin ditautkan.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold flex-shrink-0">
                2
              </span>
              <span>
                Ketuk menu titik tiga (Android) atau <b>Setelan / Settings</b> (iOS), lalu pilih <b>Perangkat Tertaut (Linked Devices)</b>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold flex-shrink-0">
                3
              </span>
              <span>
                Pilih tombol <b>Tautkan Perangkat (Link a Device)</b>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold flex-shrink-0">
                4
              </span>
              <span>
                Pilih opsi di bagian bawah: <b>Tautkan dengan nomor telepon saja (Link with phone number instead)</b>.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-xevo-panel2 border border-xevo-border flex items-center justify-center text-white font-bold flex-shrink-0">
                5
              </span>
              <span>
                Masukkan kode pairing 8 karakter yang muncul di atas dan tunggu status menjadi <b>CONNECTED</b>.
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
