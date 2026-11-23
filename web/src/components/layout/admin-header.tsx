"use client";

import React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useNav } from "./nav-context";

export function AdminHeader() {
  const { isMobileMenuOpen, toggleMobileMenu } = useNav();

  return (
    <header className="h-16 border-b-2 border-red-950/80 bg-[#160608] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu navigasi admin"}
          aria-expanded={isMobileMenuOpen}
          className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg border border-red-950 bg-[#1e0a0d] text-xevo-muted hover:text-white hover:border-xevo-red transition-colors touch-manipulation"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-xevo-red" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

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
        <div className="flex items-center gap-2 text-xs font-mono text-xevo-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-xevo-green animate-pulse shrink-0" />
          <span className="inline font-bold text-zinc-300">INTERNAL ENGINE HEALTHY</span>
        </div>
      </div>
    </header>
  );
}
