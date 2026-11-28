import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, KeyRound } from "lucide-react";
import { engineClient } from "@/lib/engine/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DashboardPage() {
  let health = { status: "unknown", activeSessions: 0, uptimeSeconds: 0 };
  let engineOnline = false;
  let userSessionCount = 0;

  // Jalankan query Supabase dan fetch status Engine secara paralel (tidak sequential)
  const [sessionRes, healthRes] = await Promise.allSettled([
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return 0;
      const adminDb = createAdminClient();
      const { count } = await adminDb
        .from("whatsapp_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      return count || 0;
    })(),
    engineClient.getHealth(),
  ]);

  if (sessionRes.status === "fulfilled") {
    userSessionCount = sessionRes.value;
  }

  if (healthRes.status === "fulfilled") {
    health = healthRes.value;
    engineOnline = true;
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m`;
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs font-mono text-xevo-muted mt-1">
            Status Engine WhatsApp dan manajemen multi-session
          </p>
        </div>

        <Link href="/dashboard/pairing" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>PAIR NOMOR BARU</span>
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono text-xevo-muted">ENGINE STATUS</span>
              <Badge variant={engineOnline ? "connected" : "disconnected"}>
                {engineOnline ? "ONLINE" : "OFFLINE"}
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black mt-2">
              Port 5004
            </CardTitle>
            <CardDescription className="text-xs">
              {engineOnline
                ? `Uptime: ${formatUptime(health.uptimeSeconds)}`
                : "Engine service tidak terjangkau"}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono text-xevo-muted">SESI ANDA</span>
              <Smartphone className="w-4 h-4 text-xevo-green shrink-0" />
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black mt-2">
              {userSessionCount} Akun
            </CardTitle>
            <CardDescription className="text-xs">
              Nomor WhatsApp Anda yang tertaut ke platform
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-mono text-xevo-muted">SECURITY LEVEL</span>
              <Badge variant="connected">HARDENED</Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-black mt-2">
              Phase 1 & 2 Lulus
            </CardTitle>
            <CardDescription className="text-xs">
              RCE eval/exec dinonaktifkan, Internal Secret Auth aktif
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Action Box */}
      <Card className="bg-gradient-to-r from-xevo-panel to-xevo-panel2 border-xevo-border">
        <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
          <div className="space-y-1.5 max-w-xl">
            <h3 className="text-base sm:text-lg font-black text-white">
              Siap Menghubungkan Nomor WhatsApp?
            </h3>
            <p className="text-xs font-mono text-xevo-muted leading-relaxed">
              Gunakan fitur pairing code 8-karakter tanpa perlu scan QR. Masukkan kode langsung di aplikasi WhatsApp ponsel Anda.
            </p>
          </div>
          <Link href="/dashboard/pairing" className="w-full md:w-auto">
            <Button size="lg" className="w-full md:w-auto whitespace-nowrap">
              MULAI PAIRING →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
