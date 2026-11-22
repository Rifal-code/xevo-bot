import React from "react";
import Link from "next/link";
import { ShieldCheck, Terminal, Activity, ArrowLeft } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-xevo-bg text-xevo-text">
      {/* Admin Operations Topbar */}
      <header className="h-16 border-b-2 border-red-950/80 bg-[#160608] px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-black text-lg tracking-wider text-white">
              PECADO<span className="text-xevo-red font-mono text-sm ml-1">ADMIN OPS</span>
            </span>
          </Link>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
            ROOT ACCESS
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-xevo-muted">
            <span className="w-2 h-2 rounded-full bg-xevo-green animate-pulse" />
            <span className="hidden sm:inline">INTERNAL ENGINE HEALTHY</span>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-md border border-xevo-border text-xevo-muted hover:text-white hover:border-xevo-red transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>USER WORKSPACE</span>
          </Link>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

      <footer className="border-t border-xevo-border py-4 text-center text-xs font-mono text-xevo-muted">
        PECADO SECURE ENGINE OPS • MULTI-SESSION ORCHESTRATOR • 2026
      </footer>
    </div>
  );
}
