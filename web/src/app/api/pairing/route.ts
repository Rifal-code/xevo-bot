import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { engineClient } from "@/lib/engine/client";
import { checkRateLimit } from "@/lib/redis/rate-limit";

const pairingSchema = z.object({
  phoneNumber: z
    .string()
    .min(8, "Nomor minimal 8 digit")
    .max(16, "Nomor maksimal 16 digit")
    .regex(/^[0-9+ -]+$/, "Format nomor tidak valid"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    
    // Rate limit: 3 request per 10 menit (600 detik)
    const rateCheck = await checkRateLimit(`pairing:${ip}`, 3, 600);
    if (!rateCheck.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Terlalu banyak request pairing. Silakan tunggu ${rateCheck.resetSeconds} detik lagi.`,
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = pairingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Nomor telepon tidak valid",
          },
        },
        { status: 400 }
      );
    }

    // Normalisasi format nomor
    let clean = parsed.data.phoneNumber.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }

    const result = await engineClient.requestPairing(clean);

    return NextResponse.json({
      success: true,
      data: {
        pairingCode: result.code,
        phoneNumber: result.number,
        expiresInSeconds: 120,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PAIRING_FAILED",
          message: error?.message || "Gagal menghasilkan kode pairing dari Engine.",
        },
      },
      { status: 500 }
    );
  }
}
