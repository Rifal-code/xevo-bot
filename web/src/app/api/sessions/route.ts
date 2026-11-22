import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { engineClient } from "@/lib/engine/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Jika belum login, jangan kembalikan sesi
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          sessions: [],
          total: 0,
        },
      });
    }

    // Ambil daftar sesi milik user ini dari Supabase PostgreSQL (Isolasi Multi-Tenant)
    const { data: dbSessions, error: dbError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dbError) {
      throw new Error(dbError.message);
    }

    // Ambil status koneksi socket real-time dari WhatsApp Engine
    const engineSessions = await engineClient.getSessions().catch(() => []);
    const engineConnectedMap = new Map(
      engineSessions.map((s) => [s.phoneNumber, s.connected])
    );

    // Sinkronisasi status socket ke Supabase jika ada sesi yang baru tersambung
    const adminDb = createAdminClient();
    for (const sess of dbSessions || []) {
      const isConnected = !!engineConnectedMap.get(sess.engine_session_ref);
      if (isConnected && sess.status !== "connected") {
        await adminDb
          .from("whatsapp_sessions")
          .update({
            status: "connected",
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", sess.id);
        sess.status = "connected";
      }
    }

    const userSessions = (dbSessions || []).map((sess) => {
      const isConnected = !!engineConnectedMap.get(sess.engine_session_ref);
      return {
        id: sess.id,
        engineSessionRef: sess.engine_session_ref,
        phoneNumberMasked: sess.phone_masked,
        connected: isConnected,
        status: isConnected ? "connected" : sess.status,
        createdAt: sess.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions: userSessions,
        total: userSessions.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SESSION_FETCH_ERROR",
          message: error?.message || "Gagal mengambil daftar sesi.",
        },
      },
      { status: 500 }
    );
  }
}
