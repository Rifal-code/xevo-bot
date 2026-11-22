import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { NavProvider } from "@/components/layout/nav-context";

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

  return (
    <NavProvider>
      <div className="min-h-screen flex flex-col bg-xevo-bg overflow-x-hidden">
        <Navbar showMenuToggle={true} />
        <div className="flex-1 flex w-full">
          <Sidebar />
          <main className="flex-1 min-w-0 p-3.5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </NavProvider>
  );
}
