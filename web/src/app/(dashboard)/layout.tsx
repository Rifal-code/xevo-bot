import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { NavProvider } from "@/components/layout/nav-context";
import { ToastProvider } from "@/components/ui/toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth guard — lapisan ke-2 setelah middleware
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Proteksi: Admin dilarang mengakses dashboard user biasa, selalu redirect ke /admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  return (
    <ToastProvider>
      <NavProvider>
        <div className="min-h-screen flex flex-col bg-xevo-bg">
          {/* Topbar — FIXED AT TOP */}
          <Navbar showMenuToggle={true} />

          {/* Body: Sidebar FIXED at left, Main content scrollable with padding */}
          <div className="flex-1 flex pt-16">
            <Sidebar />
            <div className="flex-1 flex flex-col md:pl-64 min-w-0 w-full">
              <main className="flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full">
                {children}
              </main>
            </div>
          </div>
        </div>
      </NavProvider>
    </ToastProvider>
  );
}
