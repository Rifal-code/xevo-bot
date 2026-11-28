import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-xevo-panel2 border border-xevo-border rounded-lg" />
          <div className="h-4 w-64 bg-xevo-panel2/60 rounded" />
        </div>
        <div className="h-10 w-36 bg-xevo-panel2 border border-xevo-border rounded-lg" />
      </div>

      {/* Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 bg-xevo-panel border border-xevo-border rounded-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-xevo-panel2 rounded" />
              <div className="h-5 w-16 bg-xevo-panel2 rounded-full" />
            </div>
            <div className="h-8 w-28 bg-xevo-panel2 rounded" />
            <div className="h-3 w-36 bg-xevo-panel2/60 rounded" />
          </div>
        ))}
      </div>

      {/* Banner Skeleton */}
      <div className="p-6 bg-xevo-panel border border-xevo-border rounded-xl space-y-3">
        <div className="h-5 w-52 bg-xevo-panel2 rounded" />
        <div className="h-4 w-full max-w-md bg-xevo-panel2/60 rounded" />
      </div>
    </div>
  );
}
