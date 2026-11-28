"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      // Jika user role adalah admin, langsung redirect ke /admin tanpa membuka dashboard user
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profile?.role === "admin") {
          window.location.replace("/admin");
          return;
        }
      }

      window.location.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login gagal. Periksa email dan password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-xevo-bg">
      <Card className="w-full max-w-md mx-auto shadow-xevo-brutal">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#200b0e] border border-xevo-border flex items-center justify-center text-2xl mb-2">
            ⚡
          </div>
          <CardTitle className="justify-center text-xl sm:text-2xl font-black">
            LOGIN KE PECADO
          </CardTitle>
          <CardDescription className="text-xs">
            Masukkan akun terdaftar untuk mengakses dashboard WhatsApp Engine
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-200 text-center">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "MEMPROSES..." : "MASUK →"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs font-mono text-xevo-muted">
            Belum punya akun?{" "}
            <Link href="/register" className="text-xevo-red hover:underline font-bold inline-block py-1 touch-manipulation">
              Daftar Sekarang
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
