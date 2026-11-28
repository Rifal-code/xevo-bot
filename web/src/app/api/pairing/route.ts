import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { engineClient } from "@/lib/engine/client";
import { checkRateLimit } from "@/lib/redis/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskPhoneNumber } from "@/lib/utils";

const pairingSchema = z.object({
  phoneNumber: z
    .string()
    .min(8, "Nomor minimal 8 digit")
    .max(16, "Nomor maksimal 16 digit")
    .regex(/^[0-9+ -]+$/, "Format nomor tidak valid"),
});

export const maxDuration = 45;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    
    const isDev = process.env.NODE_ENV !== "production";
    const maxLimit = isDev ? 30 : 10;
    const windowSec = isDev ? 30 : 60;

    const rateCheck = await checkRateLimit(`pairing:${ip}`, maxLimit, windowSec);
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

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await engineClient.requestPairing(clean);

    if (user) {
      try {
        const phoneMasked = maskPhoneNumber(clean);
        const phoneHash = crypto.createHash("sha256").update(clean).digest("hex");
        const adminDb = createAdminClient();

        const { data: existing } = await adminDb
          .from("whatsapp_sessions")
          .select("id")
          .eq("phone_lookup_hash", phoneHash)
          .maybeSingle();

        if (existing) {
          await adminDb
            .from("whatsapp_sessions")
            .update({
              user_id: user.id,
              phone_masked: phoneMasked,
              engine_session_ref: clean,
              status: "pairing",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await adminDb
            .from("whatsapp_sessions")
            .insert({
              user_id: user.id,
              phone_masked: phoneMasked,
              phone_lookup_hash: phoneHash,
              engine_session_ref: clean,
              status: "pairing",
              updated_at: new Date().toISOString(),
            });
        }
      } catch (dbErr) {
        console.error("❌ Gagal menyimpan sesi ke database:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        pairingCode: result.code,
        phoneNumber: result.number,
        expiresInSeconds: 240,
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

export async function GET(req: NextRequest) {
  try {
    const rawNumber = req.nextUrl.searchParams.get("number");
    if (!rawNumber) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter 'number' wajib disertakan.",
          },
        },
        { status: 400 }
      );
    }

    let clean = rawNumber.replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }

    const statusData = await engineClient.getPairingStatus(clean);

    // Jika socket sudah terverifikasi tersambung, sinkronkan ke database Supabase
    if (statusData.status === "connected") {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const phoneHash = crypto.createHash("sha256").update(clean).digest("hex");
          const adminDb = createAdminClient();
          await adminDb
            .from("whatsapp_sessions")
            .update({
              status: "connected",
              connected_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("phone_lookup_hash", phoneHash);
        }
      } catch (dbErr) {
        console.error("❌ Gagal sinkron status pairing connected ke database:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: statusData,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "STATUS_CHECK_FAILED",
          message: error?.message || "Gagal memeriksa status pairing.",
        },
      },
      { status: 500 }
    );
  }
}
