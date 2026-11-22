import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { engineClient } from "@/lib/engine/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isDev = process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile && profile.role !== "admin") {
        return NextResponse.json(
          { success: false, message: "Forbidden. Akses terbatas untuk admin." },
          { status: 403 }
        );
      }
    }

    const engineSessions = await engineClient.getSessions();

    const maskedSessions = engineSessions.map((s) => {
      const num = s.phoneNumber || "";
      const masked =
        num.length > 7
          ? `${num.slice(0, 4)}••••${num.slice(-3)}`
          : "••••••••";

      return {
        id: s.engineSessionRef,
        phoneMasked: masked,
        connected: s.connected,
        registered: s.registered,
        engineRef: s.engineSessionRef,
      };
    });

    return NextResponse.json({
      success: true,
      sessions: maskedSessions,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memuat sesi admin." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isDev = process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!user && !isDev) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile && profile.role !== "admin") {
        return NextResponse.json(
          { success: false, message: "Forbidden." },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: "sessionId diperlukan." },
        { status: 400 }
      );
    }

    // Emergency disconnect from Engine
    await engineClient.disconnectSession(sessionId);

    // Audit log
    if (user) {
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user.id,
        action: "emergency_disconnect_session",
        target_type: "session",
        target_id: sessionId,
        safe_metadata: { triggered_by: "admin_portal" },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Sesi ${sessionId} berhasil diputus oleh admin.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Gagal memutus sesi." },
      { status: 500 }
    );
  }
}
