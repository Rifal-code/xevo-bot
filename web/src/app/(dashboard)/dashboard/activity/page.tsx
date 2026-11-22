"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, ShieldCheck, Zap } from "lucide-react";

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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span>Riwayat Aktivitas</span>
          <Badge variant="outline">LOG KEAMANAN</Badge>
        </h1>
        <p className="text-xs font-mono text-xevo-muted mt-1">
          Catatan aktivitas pairing, koneksi sesi, dan audit keamanan akun Anda
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <History className="w-5 h-5 text-xevo-red" />
            <span>Timeline Event</span>
          </CardTitle>
          <CardDescription>
            Seluruh event yang dicatat tidak mengandung isi pesan chat atau data kredensial pribadi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-4 bg-xevo-panel2 border border-xevo-border rounded-xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-white">
                      {act.description}
                    </h4>
                    <span className="text-[10px] font-mono text-xevo-muted">
                      {new Date(act.timestamp).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <Badge variant="connected">{act.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
