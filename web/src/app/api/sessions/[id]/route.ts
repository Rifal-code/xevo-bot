import { NextRequest, NextResponse } from "next/server";
import { engineClient } from "@/lib/engine/client";

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

    const result = await engineClient.deleteSession(sessionId);
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
