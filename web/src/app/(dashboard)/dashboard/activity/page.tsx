"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ShieldCheck } from "lucide-react";

interface ActivityItem {
  id: string;
  eventType: string;
  description: string;
  timestamp: string;
  status: string;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activity")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setActivities(json.data.activities || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
          <span>Riwayat Aktivitas</span>
          <Badge variant="outline">LOG KEAMANAN</Badge>
        </h1>
        <p className="text-xs font-mono text-xevo-muted mt-1 leading-relaxed">
          Catatan aktivitas pairing, koneksi sesi, dan audit keamanan akun Anda
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            <History className="w-5 h-5 text-xevo-red shrink-0" />
            <span>Timeline Event</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Seluruh event yang dicatat tidak mengandung isi pesan chat atau data kredensial pribadi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-xs font-mono text-xevo-muted">
              Memuat log aktivitas...
            </div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-xevo-muted">
              Belum ada catatan aktivitas.
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 sm:p-4 bg-xevo-panel2 border border-xevo-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 sm:mt-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-mono font-bold text-white break-words">
                        {act.description}
                      </h4>
                      <span className="text-[10px] font-mono text-xevo-muted">
                        {new Date(act.timestamp).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <div className="self-end sm:self-center shrink-0">
                    <Badge variant="connected">{act.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
