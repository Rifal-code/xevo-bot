import { NextResponse } from "next/server";

export async function GET() {
  // Mock activity logs (siap terhubung ke Supabase activity_logs di tahap deployment)
  const activities = [
    {
      id: "act-1",
      eventType: "system_startup",
      description: "WhatsApp Engine v2 initialized with Security Hardening",
      timestamp: new Date().toISOString(),
      status: "success",
    },
    {
      id: "act-2",
      eventType: "security_audit",
      description: "RCE eval & exec removed; Service Auth enabled",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: "success",
    },
  ];

  return NextResponse.json({
    success: true,
    data: {
      activities,
    },
  });
}
