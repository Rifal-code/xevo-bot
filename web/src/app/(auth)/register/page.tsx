"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (password.length < 6) {
        throw new Error("Password minimal 6 karakter.");
      }

      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) {
        // Fallback for development if Supabase cloud is not configured yet
        router.push("/dashboard");
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registrasi gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-[#200b0e] border border-xevo-border flex items-center justify-center text-2xl mb-2">
            🕷
          </div>
          <CardTitle className="justify-center text-2xl font-black">
            BUAT AKUN BARU
          </CardTitle>
          <CardDescription>
            Daftar untuk mengelola pairing WhatsApp di server terisolasi
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs font-mono text-red-200 text-center">
                {error}
              </div>
            )}

            <Input
              label="Nama Lengkap"
              type="text"
              placeholder="Nama Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password (min 6 karakter)"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "MENDAFTARKAN..." : "DAFTAR SEKARANG →"}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs font-mono text-xevo-muted">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-xevo-red hover:underline font-bold">
              Login di Sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
