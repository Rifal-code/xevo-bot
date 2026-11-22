import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "connected" | "pairing" | "disconnected" | "outline";
}

export function Badge({
  className,
  variant = "connected",
  children,
  ...props
}: BadgeProps) {
  const variants = {
    connected: "bg-[#0e271b] text-xevo-green border border-[#1b5e39]",
    pairing: "bg-[#30270c] text-xevo-yellow border border-[#6b5212]",
    disconnected: "bg-[#2d0f13] text-xevo-redLight border border-[#631821]",
    outline: "border border-xevo-border text-xevo-muted",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase",
        variants[variant],
        className
      )}
      {...props}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      {children}
    </span>
  );
}
