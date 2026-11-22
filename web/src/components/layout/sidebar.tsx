"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, LayoutDashboard, History, Settings, ShieldAlert, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pair WhatsApp", href: "/dashboard/pairing", icon: QrCode },
  { label: "Session List", href: "/dashboard/sessions", icon: History },
  { label: "Admin Ops", href: "/admin", icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [userName, setUserName] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [sessionCount, setSessionCount] = React.useState(0);

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

        // Quota check — hitung semua status (pairing, connected, disconnected)
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
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/login";
  };

  const visibleNav = NAV_ITEMS.filter((item) => item.href !== "/admin" || isAdmin);

  return (
    <aside className="w-64 border-r-2 border-xevo-border bg-xevo-panel flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-4">
        {/* User Profile Card */}
        <div className="p-3 bg-xevo-panel2 border border-xevo-border rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-xevo-panel border border-xevo-border flex items-center justify-center text-sm font-black text-xevo-red shrink-0">
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

        <nav className="space-y-1.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-mono font-bold transition-all",
                  isActive
                    ? "bg-xevo-red text-white shadow-xevo-btn border border-[#ff4b55]"
                    : "text-xevo-muted hover:text-white hover:bg-xevo-panel2 border border-transparent"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-xevo-border pt-4 px-2 space-y-3">
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
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-mono text-xevo-muted hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
}
