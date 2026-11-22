import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label className="text-xs font-mono font-bold text-xevo-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 bg-[#0d090b] border-2 border-xevo-border rounded-lg text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-xevo-red transition-colors text-sm",
            error && "border-red-500",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-400 font-mono">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
