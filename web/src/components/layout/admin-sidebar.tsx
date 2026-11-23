"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useNav } from "./nav-context";

export function AdminSidebar() {
  const pathname = usePathname();
  const { isMobileMenuOpen, closeMobileMenu } = useNav();
  const [userName, setUserName] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadAdminUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, display_name")
          .eq("id", user.id)
          .single();

        const displayName =
          profile?.display_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Administrator";
        setUserName(displayName);
        setUserEmail(user.email || null);
      } catch {}
    }
    loadAdminUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/login";
  };

  const navigationContent = (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-4">
        {/* User Account / Profile Card */}
        <div className="p-3 bg-[#1e0a0d] border border-red-900/60 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-950 border border-red-800 flex items-center justify-center text-sm font-black text-xevo-red shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="block text-xs font-black text-white truncate">
                {userName || "Admin"}
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-800 shrink-0">
                ROOT
              </span>
            </div>
            <span className="block text-[10px] font-mono text-zinc-400 truncate">
              {userEmail || "admin@pecado"}
            </span>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-2">
          <span className="text-[9px] font-mono font-bold tracking-widest text-red-400 uppercase">
            ADMIN WORKSPACE
          </span>
        </div>

        {/* Navigation Menu — HANYA ADA MENU ADMIN OPS */}
        <nav className="space-y-1.5" aria-label="Menu Navigasi Admin">
          <Link
            href="/admin"
            onClick={closeMobileMenu}
            className={cn(
              "flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-mono font-bold transition-all min-h-[44px] touch-manipulation",
              pathname === "/admin"
                ? "bg-xevo-red text-white shadow-xevo-btn border border-[#ff4b55]"
                : "text-xevo-muted hover:text-white hover:bg-[#1a080a] border border-transparent"
            )}
          >
            <ShieldAlert className="w-4 h-4 shrink-0 text-white" />
            <span className="truncate">Admin Ops</span>
          </Link>
        </nav>
      </div>

      {/* Footer Area with Logout Button */}
      <div className="border-t border-red-950/80 pt-4 px-1 space-y-3">
        <div className="p-2.5 bg-[#170507] border border-red-950 rounded-lg text-center">
          <span className="block text-[10px] font-mono text-red-400 font-bold">
            PRIVILEGED ACCESS
          </span>
          <span className="block text-[11px] font-mono text-zinc-300 mt-0.5">
            Full Engine Control
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-900/60 bg-red-950/30 hover:bg-red-950/70 hover:border-red-700 text-xs font-mono text-red-300 hover:text-white transition-colors touch-manipulation cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>LOGOUT</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Admin Sidebar — LOCKED / FIXED */}
      <aside className="hidden md:flex w-64 border-r-2 border-red-950/80 bg-[#120406] flex-col p-4 fixed top-16 left-0 bottom-0 overflow-y-auto shrink-0 z-40">
        {navigationContent}
      </aside>

      {/* Mobile Slide-out Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div
            className="relative w-72 max-w-[85vw] h-full bg-[#120406] border-r-2 border-red-950/80 p-4 shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi admin"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-red-950">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="font-black text-sm tracking-wider text-white">
                  PECADO<span className="text-xevo-red font-mono text-xs ml-1">ADMIN</span>
                </span>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label="Tutup navigasi"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-950 bg-[#1e0a0d] text-xevo-muted hover:text-white hover:border-xevo-red transition-colors touch-manipulation"
              >
                <X className="w-5 h-5 text-xevo-red" />
              </button>
            </div>

            {/* Navigation Body */}
            <div className="flex-1 min-h-0">{navigationContent}</div>
          </div>
        </div>
      )}
    </>
  );
}
