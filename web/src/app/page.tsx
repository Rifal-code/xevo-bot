import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, Zap, KeyRound, Server } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-16 flex flex-col items-center text-center">
        {/* Hero Section */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-xevo-border bg-xevo-panel text-xevo-redLight font-mono text-xs mb-6 shadow-xevo-brutal">
          <span>⚡</span>
          <span>PECADO SECURE WEB PLATFORM V2</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-3xl leading-tight">
          Kelola WhatsApp Engine dengan{" "}
          <span className="text-xevo-red underline decoration-wavy underline-offset-8">
            Keamanan Tinggi
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-xevo-muted max-w-2xl font-mono leading-relaxed">
          Platform multi-session WhatsApp modern. Tautkan nomor secara instan dengan pairing code 8 karakter, isolasi akun per-user, dan integrasi WhatsApp Engine yang aman.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link href="/login">
            <Button size="lg" className="px-8">
              MASUK KE DASHBOARD →
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary" size="lg" className="px-8">
              DAFTAR AKUN BARU
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-20 text-left w-full">
          <Card>
            <CardHeader>
              <CardTitle>
                <KeyRound className="w-5 h-5 text-xevo-red" />
                <span>Pairing Code 8-Digit</span>
              </CardTitle>
              <CardDescription>
                Tautkan perangkat tanpa scan QR fisik. Masukkan kode numerik langsung di aplikasi WhatsApp Anda.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <ShieldCheck className="w-5 h-5 text-xevo-green" />
                <span>Multi-Tenant RLS</span>
              </CardTitle>
              <CardDescription>
                Data sesi dienkripsi dan diproteksi Row Level Security Supabase. User lain tidak bisa melihat nomor Anda.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Server className="w-5 h-5 text-xevo-yellow" />
                <span>Dedicated Engine</span>
              </CardTitle>
              <CardDescription>
                Socket persisten Node.js terpisah dari serverless web. Koneksi WhatsApp tetap aktif 24/7.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <footer className="border-t border-xevo-border py-8 text-center text-xs font-mono text-xevo-muted">
        PECADO WEB PLATFORM • SECURE INTEGRATION • 2026
      </footer>
    </div>
  );
}
