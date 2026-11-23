import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ToastProvider } from "@/components/ui/toast";
import { NavProvider } from "@/components/layout/nav-context";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

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
    <ToastProvider>
      <NavProvider>
        <div className="min-h-screen flex flex-col bg-xevo-bg text-xevo-text">
          {/* Admin Operations Topbar */}
          <AdminHeader />

          {/* Admin Layout with locked Admin Sidebar & Main Content */}
          <div className="flex flex-1 w-full min-w-0">
            <AdminSidebar />
            <main className="flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
              {children}
            </main>
          </div>

          <footer className="border-t border-red-950/80 bg-[#0f0405] py-4 text-center text-[10px] sm:text-xs font-mono text-xevo-muted px-4">
            PECADO SECURE ENGINE OPS • MULTI-SESSION ORCHESTRATOR • 2026
          </footer>
        </div>
      </NavProvider>
    </ToastProvider>
  );
}
