"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, LayoutDashboard, History, ShieldAlert, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useNav } from "./nav-context";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pair WhatsApp", href: "/dashboard/pairing", icon: QrCode },
  { label: "Session List", href: "/dashboard/sessions", icon: History },
  { label: "Admin Ops", href: "/admin", icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isMobileMenuOpen, closeMobileMenu } = useNav();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [sessionCount, setSessionCount] = React.useState(0);
  const [pendingHref, setPendingHref] = React.useState<string | null>(null);

  // Reset state pending navigasi saat rute berhasil berpindah
  React.useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  React.useEffect(() => {
    async function checkRoleAndQuota() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Role & Profile check
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, display_name")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
        }

        const displayName =
          profile?.display_name ||
          user.user_metadata?.full_name ||
          user.email?.split("@")[0] ||
          "Pengguna";
        setUserName(displayName);
        setUserEmail(user.email || null);

        // Quota check — hitung semua status selain deleted
        const { count } = await supabase
          .from("whatsapp_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "deleted");
        setSessionCount(count || 0);
      } catch {
        // Guest / non-admin
      }
    }
    checkRoleAndQuota();
  }, []); // Cukup sekali saat mount agar tidak melakukan 3 query Supabase setiap klik menu

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/login";
  };

  const visibleNav = NAV_ITEMS.filter((item) => item.href !== "/admin" || isAdmin);

  const navigationContent = (
    <div className="flex flex-col justify-between h-full space-y-6">
      <div className="space-y-4">
        {/* User Profile Card */}
        <div className="p-3 bg-xevo-panel2 border border-xevo-border rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-xevo-panel border border-xevo-border flex items-center justify-center text-sm font-black text-xevo-red shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="overflow-hidden min-w-0 flex-1">
            <span className="block text-xs font-black text-white truncate">
              {userName || "Memuat..."}
            </span>
            <span className="block text-[10px] font-mono text-xevo-muted truncate">
              {userEmail || "user@pecado"}
            </span>
          </div>
        </div>

        <div className="px-2">
          <span className="text-[9px] font-mono font-bold tracking-widest text-xevo-muted uppercase">
            {isAdmin ? "Admin Workspace" : "User Workspace"}
          </span>
        </div>

        <nav className="space-y-1.5" aria-label="Menu Navigasi Utama">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const isPending = pendingHref === item.href && !isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (pathname !== item.href) {
                    setPendingHref(item.href);
                  }
                  closeMobileMenu();
                }}
                className={cn(
                  "flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-mono font-bold transition-all min-h-[44px] touch-manipulation select-none",
                  isActive
                    ? "bg-xevo-red text-white shadow-xevo-btn border border-[#ff4b55]"
                    : isPending
                    ? "bg-xevo-panel2 text-white border border-xevo-red shadow-xevo-btn scale-[0.98] ring-1 ring-xevo-red/50"
                    : "text-xevo-muted hover:text-white hover:bg-xevo-panel2 border border-transparent active:scale-[0.98]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-transform",
                      isPending && "animate-spin text-xevo-red"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {isPending && (
                  <span className="text-[9px] font-mono text-xevo-red font-black tracking-wider uppercase animate-pulse">
                    Memuat...
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-xevo-border pt-4 px-1 space-y-3">
        <div className="p-3 bg-xevo-panel2 border border-xevo-border rounded-lg text-center">
          <span className="block text-[10px] font-mono text-xevo-muted font-bold">
            SESSION QUOTA
          </span>
          <span className="block text-sm font-black text-white mt-1">
            {sessionCount} / 3 SESI
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-transparent hover:border-red-900 hover:bg-red-950/40 text-xs font-mono text-xevo-muted hover:text-red-400 transition-colors touch-manipulation"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>LOGOUT</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar — LOCKED / FIXED */}
      <aside className="hidden md:flex w-64 border-r-2 border-xevo-border bg-xevo-panel flex-col p-4 fixed top-16 left-0 bottom-0 overflow-y-auto shrink-0 z-40">
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
            className="relative w-72 max-w-[85vw] h-full bg-xevo-panel border-r-2 border-xevo-border p-4 shadow-2xl flex flex-col z-10 overflow-y-auto animate-in slide-in-from-left duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi mobile"
          >
            {/* Drawer Header with Close Button */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-xevo-border">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="font-black text-sm tracking-wider text-white">
                  PECADO<span className="text-xevo-red font-mono text-xs ml-1">MENU</span>
                </span>
              </div>
              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label="Tutup navigasi"
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-xevo-border bg-xevo-panel2 text-xevo-muted hover:text-white hover:border-xevo-red transition-colors touch-manipulation"
              >
                <X className="w-5 h-5 text-xevo-red" />
              </button>
            </div>

            {/* Navigation Body */}
            <div className="flex-1 min-h-0">
              {navigationContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
