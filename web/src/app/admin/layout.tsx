import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteksi: Pengguna wajib login untuk masuk admin
  if (!user) {
    redirect("/login");
  }

  // Proteksi: Hanya user dengan role admin pada tabel profiles yang diizinkan
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-xevo-bg text-xevo-text overflow-x-hidden">
      {/* Admin Operations Topbar */}
      <header className="h-16 border-b-2 border-red-950/80 bg-[#160608] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xl shrink-0">⚡</span>
            <span className="font-black text-base sm:text-lg tracking-wider text-white">
              PECADO<span className="text-xevo-red font-mono text-xs sm:text-sm ml-1">ADMIN</span>
            </span>
          </Link>
          <span className="hidden xs:inline-flex text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
            ROOT
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono text-xevo-muted">
            <span className="w-2 h-2 rounded-full bg-xevo-green animate-pulse shrink-0" />
            <span className="hidden md:inline">INTERNAL ENGINE HEALTHY</span>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 sm:px-3 py-1.5 min-h-[38px] rounded-md border border-xevo-border text-xevo-muted hover:text-white hover:border-xevo-red transition-colors touch-manipulation"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">USER WORKSPACE</span>
            <span className="xs:hidden">USER</span>
          </Link>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        {children}
      </main>

      <footer className="border-t border-xevo-border py-4 text-center text-[10px] sm:text-xs font-mono text-xevo-muted px-4">
        PECADO SECURE ENGINE OPS • MULTI-SESSION ORCHESTRATOR • 2026
      </footer>
    </div>
  );
}
