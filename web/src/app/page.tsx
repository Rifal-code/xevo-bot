import { Navbar } from "@/components/layout/navbar";
import { LandingCta } from "@/components/landing-cta";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, KeyRound, Server } from "lucide-react";
import { NavProvider } from "@/components/layout/nav-context";

export default function LandingPage() {
  return (
    <NavProvider>
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        <Navbar />

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center text-center">
          {/* Hero Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-xevo-border bg-xevo-panel text-xevo-redLight font-mono text-[11px] sm:text-xs mb-6 shadow-xevo-brutal max-w-full truncate">
            <span>⚡</span>
            <span className="truncate">PECADO SECURE WEB PLATFORM V2</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-3xl leading-tight sm:leading-tight">
            Kelola WhatsApp Engine dengan{" "}
            <span className="text-xevo-red underline decoration-wavy underline-offset-4 sm:underline-offset-8">
              Keamanan Tinggi
            </span>
          </h1>

          <p className="mt-4 sm:mt-6 text-xs sm:text-base text-xevo-muted max-w-2xl font-mono leading-relaxed sm:leading-relaxed px-1">
            Platform multi-session WhatsApp modern. Tautkan nomor secara instan dengan pairing code 8 karakter, isolasi akun per-user, dan integrasi WhatsApp Engine yang aman.
          </p>

          <LandingCta />

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-14 sm:mt-20 text-left w-full">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  <KeyRound className="w-5 h-5 text-xevo-red shrink-0" />
                  <span>Pairing Code 8-Digit</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Tautkan perangkat tanpa scan QR fisik. Masukkan kode numerik langsung di aplikasi WhatsApp Anda.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  <ShieldCheck className="w-5 h-5 text-xevo-green shrink-0" />
                  <span>Multi-Tenant RLS</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Data sesi dienkripsi dan diproteksi Row Level Security Supabase. User lain tidak bisa melihat nomor Anda.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  <Server className="w-5 h-5 text-xevo-yellow shrink-0" />
                  <span>Dedicated Engine</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Socket persisten Node.js terpisah dari serverless web. Koneksi WhatsApp tetap aktif 24/7.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>

        <footer className="border-t border-xevo-border py-6 sm:py-8 text-center text-[10px] sm:text-xs font-mono text-xevo-muted px-4">
          PECADO WEB PLATFORM • SECURE INTEGRATION • 2026
        </footer>
      </div>
    </NavProvider>
  );
}
