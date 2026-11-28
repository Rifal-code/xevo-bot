import React from "react";

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-xevo-bg/80 backdrop-blur-xs">
      <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-xevo-panel border border-xevo-border shadow-xevo-brutal">
        <div className="w-8 h-8 border-3 border-xevo-red border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono font-bold text-white tracking-widest uppercase">
          Memuat Halaman...
        </span>
      </div>
    </div>
  );
}
