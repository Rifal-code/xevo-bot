import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-bold tracking-wide transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      primary:
        "bg-xevo-red hover:bg-xevo-redLight text-white border border-[#ff4b55] rounded-lg shadow-xevo-btn active:translate-x-1 active:translate-y-1 active:shadow-none",
      secondary:
        "bg-xevo-panel2 hover:bg-[#250d12] text-xevo-text border border-xevo-border rounded-lg shadow-xevo-btn active:translate-x-1 active:translate-y-1 active:shadow-none",
      danger:
        "bg-red-800 hover:bg-red-700 text-white border border-red-500 rounded-lg shadow-xevo-btn active:translate-x-1 active:translate-y-1",
      ghost: "hover:bg-xevo-panel2 text-xevo-muted hover:text-white rounded-lg",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-5 py-2.5 text-sm",
      lg: "px-6 py-3.5 text-base",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
