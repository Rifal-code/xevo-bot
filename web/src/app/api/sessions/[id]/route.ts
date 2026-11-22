import { NextRequest, NextResponse } from "next/server";
import { engineClient } from "@/lib/engine/client";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { message: "ID sesi diperlukan" } },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let engineRef = sessionId;
    if (user) {
      const { data: dbSess } = await supabase
        .from("whatsapp_sessions")
        .select("id, engine_session_ref")
        .eq("user_id", user.id)
        .or(`id.eq.${sessionId},engine_session_ref.eq.${sessionId}`)
        .maybeSingle();

      if (dbSess) {
        engineRef = dbSess.engine_session_ref;
        await supabase
          .from("whatsapp_sessions")
          .delete()
          .eq("id", dbSess.id);
      }
    }

    const result = await engineClient.deleteSession(engineRef).catch(() => ({ success: true }));
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DELETE_FAILED",
          message: error?.message || "Gagal menghapus sesi.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;
    const body = await req.json().catch(() => ({}));
    const action = body.action || "disconnect";

    if (action === "disconnect") {
      const result = await engineClient.disconnectSession(sessionId);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, error: { message: "Aksi tidak dikenal" } },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ACTION_FAILED",
          message: error?.message || "Gagal menjalankan aksi sesi.",
        },
      },
      { status: 500 }
    );
  }
}
