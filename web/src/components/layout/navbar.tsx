"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNav } from "./nav-context";

export function Navbar({ showMenuToggle = false }: { showMenuToggle?: boolean }) {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { isMobileMenuOpen, toggleMobileMenu } = useNav();

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
    <header className="h-16 border-b-2 border-xevo-border bg-xevo-panel/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 flex items-center justify-between">
      {/* Left side: Hamburger (if enabled) + Brand */}
      <div className="flex items-center gap-2 sm:gap-3">
        {showMenuToggle && (
          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu navigasi"}
            aria-expanded={isMobileMenuOpen}
            className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-xevo-border bg-xevo-panel2 text-xevo-muted hover:text-white hover:border-xevo-red transition-colors touch-manipulation"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-xevo-red" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        )}

        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
          <span className="text-xl shrink-0">⚡</span>
          <span className="font-black text-base sm:text-lg tracking-wider text-white group-hover:text-xevo-red transition-colors">
            PECADO<span className="text-xevo-red font-mono text-xs sm:text-sm ml-1">WEB</span>
          </span>
        </Link>

        <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded bg-[#200b0e] text-xevo-redLight border border-xevo-border">
          SECURE ENGINE V2
        </span>
      </div>

      {/* Right side: Engine status indicator + Auth controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 text-xs font-mono text-xevo-muted" title="Status Engine WhatsApp">
          <span className="w-2 h-2 rounded-full bg-xevo-green animate-pulse shrink-0" />
          <span className="hidden sm:inline">ENGINE CONNECTED</span>
        </div>

        {loading ? (
          <div className="w-16 h-8 rounded bg-xevo-panel2 border border-xevo-border animate-pulse" />
        ) : userEmail ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-xevo-panel2 border border-xevo-border text-xs font-mono text-zinc-300">
              <User className="w-3.5 h-3.5 text-xevo-red shrink-0" />
              <span className="max-w-[120px] lg:max-w-[180px] truncate">{userEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-mono font-bold px-2.5 sm:px-3 py-1.5 min-h-[38px] sm:min-h-[40px] rounded-md border border-red-900 bg-red-950/40 text-red-200 hover:bg-red-900/60 transition-colors flex items-center gap-1.5 touch-manipulation"
              title="Keluar dari akun"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">KELUAR</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-mono font-bold px-3 py-1.5 min-h-[38px] flex items-center rounded-md border border-xevo-border text-xevo-text hover:border-xevo-red transition-colors touch-manipulation"
          >
            LOGIN
          </Link>
        )}
      </div>
    </header>
  );
}
