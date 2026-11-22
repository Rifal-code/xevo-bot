"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, LayoutDashboard, History, Settings, ShieldAlert, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pair WhatsApp", href: "/dashboard/pairing", icon: QrCode },
  { label: "Session List", href: "/dashboard/sessions", icon: History },
  { label: "Bot Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r-2 border-xevo-border bg-xevo-panel flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div className="px-3 py-2">
          <span className="text-[9px] font-mono font-bold tracking-widest text-xevo-muted uppercase">
            User Workspace
          </span>
        </div>

        <nav className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
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
            0 / 3 SESI
          </span>
        </div>

        <button
          onClick={() => {
            window.location.href = "/login";
          }}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-mono text-xevo-muted hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOGOUT</span>
        </button>
      </div>
    </aside>
  );
}
