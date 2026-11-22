import { NextResponse } from "next/server";
import { engineClient } from "@/lib/engine/client";
import { maskPhoneNumber } from "@/lib/utils";

export async function GET() {
  try {
    const rawSessions = await engineClient.getSessions();
    const maskedSessions = rawSessions.map((s) => ({
      ...s,
      phoneNumberMasked: maskPhoneNumber(s.phoneNumber),
    }));

    return NextResponse.json({
      success: true,
      data: {
        sessions: maskedSessions,
        total: maskedSessions.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ENGINE_ERROR",
          message: error?.message || "Gagal mengambil daftar sesi dari Engine.",
        },
      },
      { status: 500 }
    );
  }
}
