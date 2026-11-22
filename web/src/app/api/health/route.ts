import { NextResponse } from "next/server";
import { engineClient } from "@/lib/engine/client";

export async function GET() {
  try {
    const health = await engineClient.getHealth();
    return NextResponse.json({
      success: true,
      web: "healthy",
      engine: health,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        web: "healthy",
        engine: "unreachable",
        message: error?.message || "Engine unreachable",
      },
      { status: 503 }
    );
  }
}
