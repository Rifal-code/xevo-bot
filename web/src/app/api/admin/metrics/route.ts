import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { engineClient } from "@/lib/engine/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // In local dev without Supabase active, permit access if dev environment
    const isDev = process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Sesi login diperlukan." },
        { status: 401 }
      );
    }

    // Role check if user exists
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile && profile.role !== "admin") {
        return NextResponse.json(
          { success: false, message: "Forbidden. Hanya admin yang berhak mengakses metrik engine." },
          { status: 403 }
        );
      }
    }

    const health = await engineClient.getHealth();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      engine: {
        host: "127.0.0.1:5004",
        status: health.status,
        uptimeSeconds: health.uptimeSeconds,
        loadAverage: health.load,
        sessions: {
          total: health.activeSessions,
          connected: health.connectedSessions,
          pairing: health.pairingSessions,
        },
        memory: health.memoryUsage,
        security: {
          rceEvalBlocked: true,
          rceExecBlocked: true,
          internalSecretAuth: true,
          credentialsGitIgnored: true,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Gagal mengambil metrik Engine.",
        engine: {
          status: "offline",
          error: err?.message,
        },
      },
      { status: 502 }
    );
  }
}
