"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  return (
    <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto px-4 sm:px-0 max-w-md sm:max-w-none">
      <Link
        href="/dashboard"
        className="w-full sm:w-auto"
        onClick={() => setNavigatingTo("/dashboard")}
      >
        <Button
          size="lg"
          className="w-full sm:w-auto px-6 sm:px-8 relative overflow-hidden"
          disabled={navigatingTo === "/dashboard"}
        >
          {navigatingTo === "/dashboard" ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              <span>MEMBUKA DASHBOARD...</span>
            </span>
          ) : (
            <span>MASUK KE DASHBOARD →</span>
          )}
        </Button>
      </Link>

      <Link
        href="/register"
        className="w-full sm:w-auto"
        onClick={() => setNavigatingTo("/register")}
      >
        <Button
          variant="secondary"
          size="lg"
          className="w-full sm:w-auto px-6 sm:px-8"
          disabled={navigatingTo === "/register"}
        >
          {navigatingTo === "/register" ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-xevo-text border-t-transparent rounded-full animate-spin shrink-0" />
              <span>MEMPROSES...</span>
            </span>
          ) : (
            <span>DAFTAR AKUN BARU</span>
          )}
        </Button>
      </Link>
    </div>
  );
}
