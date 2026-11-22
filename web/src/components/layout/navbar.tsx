import React from "react";
import Link from "next/link";
import { Shield, Smartphone, Activity, Terminal } from "lucide-react";

export function Navbar() {
  return (
    <header className="h-16 border-b-2 border-xevo-border bg-xevo-panel/90 backdrop-blur sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl">⚡</span>
          <span className="font-black text-lg tracking-wider text-white group-hover:text-xevo-red transition-colors">
            PECADO<span className="text-xevo-red font-mono text-sm ml-1">WEB</span>
          </span>
        </Link>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#200b0e] text-xevo-redLight border border-xevo-border">
          SECURE ENGINE V2
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-xevo-muted">
          <span className="w-2 h-2 rounded-full bg-xevo-green animate-pulse" />
          <span className="hidden sm:inline">ENGINE CONNECTED</span>
        </div>
        <Link
          href="/login"
          className="text-xs font-mono font-bold px-3 py-1.5 rounded-md border border-xevo-border text-xevo-text hover:border-xevo-red transition-colors"
        >
          LOGIN
        </Link>
      </div>
    </header>
  );
}
