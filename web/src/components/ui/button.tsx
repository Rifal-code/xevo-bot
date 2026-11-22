import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-bold tracking-wide transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation active:scale-[0.98]";

    const variants = {
      primary:
        "bg-xevo-red hover:bg-xevo-redLight text-white border border-[#ff4b55] rounded-lg shadow-xevo-btn active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      secondary:
        "bg-xevo-panel2 hover:bg-[#250d12] text-xevo-text border border-xevo-border rounded-lg shadow-xevo-btn active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
      danger:
        "bg-red-800 hover:bg-red-700 text-white border border-red-500 rounded-lg shadow-xevo-btn active:translate-x-0.5 active:translate-y-0.5",
      ghost: "hover:bg-xevo-panel2 text-xevo-muted hover:text-white rounded-lg",
    };

    const sizes = {
      sm: "min-h-[38px] px-3 py-2 text-xs",
      md: "min-h-[44px] px-4 sm:px-5 py-2.5 text-xs sm:text-sm",
      lg: "min-h-[48px] px-5 sm:px-6 py-3 text-sm sm:text-base",
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
