import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Activity, KeyRound, Server, RefreshCw } from "lucide-react";
import { engineClient } from "@/lib/engine/client";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  let health = { status: "unknown", activeSessions: 0, uptimeSeconds: 0 };
  let engineOnline = false;
  let userSessionCount = 0;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { count } = await supabase
        .from("whatsapp_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      userSessionCount = count || 0;
    }
  } catch {}

  try {
    health = await engineClient.getHealth();
    engineOnline = true;
  } catch {
    engineOnline = false;
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d > 0 ? `${d}d ` : ""}${h}h ${m}m`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-xs font-mono text-xevo-muted mt-1">
            Status Engine WhatsApp dan manajemen multi-session
          </p>
        </div>

        <Link href="/dashboard/pairing">
          <Button className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            <span>PAIR NOMOR BARU</span>
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-xevo-muted">ENGINE STATUS</span>
              <Badge variant={engineOnline ? "connected" : "disconnected"}>
                {engineOnline ? "ONLINE" : "OFFLINE"}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-black mt-2">
              Port 5004
            </CardTitle>
            <CardDescription>
              {engineOnline
                ? `Uptime: ${formatUptime(health.uptimeSeconds)}`
                : "Engine service tidak terjangkau"}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-xevo-muted">SESI ANDA</span>
              <Smartphone className="w-4 h-4 text-xevo-green" />
            </div>
            <CardTitle className="text-2xl font-black mt-2">
              {userSessionCount} Akun
            </CardTitle>
            <CardDescription>
              Nomor WhatsApp Anda yang tertaut ke platform
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-xevo-muted">SECURITY LEVEL</span>
              <Badge variant="connected">HARDENED</Badge>
            </div>
            <CardTitle className="text-2xl font-black mt-2">
              Phase 1 & 2 Lulus
            </CardTitle>
            <CardDescription>
              RCE eval/exec dinonaktifkan, Internal Secret Auth aktif
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Action Box */}
      <Card className="bg-gradient-to-r from-xevo-panel to-xevo-panel2 border-xevo-border">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">
              Siap Menghubungkan Nomor WhatsApp?
            </h3>
            <p className="text-xs font-mono text-xevo-muted">
              Gunakan fitur pairing code 8-karakter tanpa perlu scan QR. Masukkan kode langsung di aplikasi WhatsApp ponsel Anda.
            </p>
          </div>
          <Link href="/dashboard/pairing">
            <Button size="lg" className="whitespace-nowrap">
              MULAI PAIRING →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
