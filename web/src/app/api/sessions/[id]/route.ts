import { NextRequest, NextResponse } from "next/server";
import { engineClient } from "@/lib/engine/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const adminDb = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

    let engineRef = sessionId;

    // Cari data sesi di Supabase
    let query = adminDb.from("whatsapp_sessions").select("id, engine_session_ref, user_id");
    if (isUuid) {
      query = query.eq("id", sessionId);
    } else {
      query = query.eq("engine_session_ref", sessionId);
    }
    if (user) {
      query = query.eq("user_id", user.id);
    }

    const { data: dbSess, error: findError } = await query.maybeSingle();

    if (findError) {
      console.error("Error mencari sesi di DB:", findError);
    }

    if (dbSess) {
      engineRef = dbSess.engine_session_ref || sessionId;
      const { error: delError } = await adminDb
        .from("whatsapp_sessions")
        .delete()
        .eq("id", dbSess.id);

      if (delError) {
        console.error("Gagal menghapus sesi dari database:", delError);
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DB_DELETE_FAILED",
              message: `Gagal menghapus sesi dari database: ${delError.message}`,
            },
          },
          { status: 500 }
        );
      }
    } else {
      // Jika tidak ditemukan dengan user_id (atau format non-uuid), hapus langsung by engine_session_ref
      await adminDb.from("whatsapp_sessions").delete().eq("engine_session_ref", sessionId);
    }

    // Hapus sesi dan file auth dari WhatsApp Engine
    try {
      await engineClient.deleteSession(engineRef);
    } catch (engineErr: any) {
      console.warn("Peringatan saat menghapus sesi di engine:", engineErr?.message);
    }

    return NextResponse.json({
      success: true,
      data: { message: "Sesi berhasil dihapus secara permanen." },
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
    const adminDb = createAdminClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);

    if (action === "disconnect") {
      let result;
      try {
        result = await engineClient.disconnectSession(sessionId);
      } catch (e: any) {
        console.warn("Peringatan saat memutus engine session:", e?.message);
      }

      // Update status di Supabase menjadi disconnected
      let updateQuery = adminDb.from("whatsapp_sessions").update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (isUuid) {
        updateQuery = updateQuery.eq("id", sessionId);
      } else {
        updateQuery = updateQuery.eq("engine_session_ref", sessionId);
      }
      await updateQuery;

      return NextResponse.json({
        success: true,
        data: result || { message: "Sesi berhasil diputuskan" },
      });
    }

    if (action === "reconnect") {
      try {
        const result = await engineClient.reconnectSession(sessionId);

        // Update status di Supabase menjadi connected
        let updateQuery = adminDb.from("whatsapp_sessions").update({
          status: "connected",
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (isUuid) {
          updateQuery = updateQuery.eq("id", sessionId);
        } else {
          updateQuery = updateQuery.eq("engine_session_ref", sessionId);
        }
        await updateQuery;

        return NextResponse.json({
          success: true,
          data: result,
        });
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            needPairing: true,
            error: {
              code: "CREDS_MISSING",
              message: err?.message || "Kredensial auth sesi tidak ditemukan. Silakan hubungkan ulang melalui Pairing.",
            },
          },
          { status: 400 }
        );
      }
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
