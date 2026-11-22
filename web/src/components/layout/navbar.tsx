"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function Navbar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserEmail(user?.email ?? null);
      } catch {
        setUserEmail(null);
      } finally {
        setLoading(false);
      }
    }
    getUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/login";
  };

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

        {loading ? (
          <div className="w-16 h-7 rounded bg-xevo-panel2 border border-xevo-border animate-pulse" />
        ) : userEmail ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-xevo-panel2 border border-xevo-border text-xs font-mono text-zinc-300">
              <User className="w-3.5 h-3.5 text-xevo-red" />
              <span className="max-w-[150px] truncate">{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-mono font-bold px-3 py-1.5 rounded-md border border-red-900 bg-red-950/40 text-red-200 hover:bg-red-900/60 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>KELUAR</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-md border border-xevo-border text-xevo-text hover:border-xevo-red transition-colors"
          >
            LOGIN
          </Link>
        )}
      </div>
    </header>
  );
}
