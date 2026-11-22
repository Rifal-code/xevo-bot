"use client";

import React, { useEffect } from "react";
import { Button } from "./button";
import { AlertTriangle, PowerOff, Trash2, Info, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "KONFIRMASI",
  cancelText = "BATAL",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  // ESC key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const iconConfig = {
    danger: {
      icon: Trash2,
      bgColor: "bg-red-950/80",
      borderColor: "border-red-600",
      iconColor: "text-red-500",
      buttonVariant: "danger" as const,
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-amber-950/80",
      borderColor: "border-amber-600",
      iconColor: "text-amber-400",
      buttonVariant: "primary" as const,
    },
    info: {
      icon: Info,
      bgColor: "bg-[#14090b]",
      borderColor: "border-xevo-border",
      iconColor: "text-xevo-muted",
      buttonVariant: "secondary" as const,
    },
    success: {
      icon: CheckCircle2,
      bgColor: "bg-emerald-950/80",
      borderColor: "border-emerald-600",
      iconColor: "text-emerald-400",
      buttonVariant: "primary" as const,
    },
  };

  const current = iconConfig[variant];
  const IconComponent = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Dark backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!loading) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-xevo-panel border-2 border-xevo-border rounded-2xl shadow-xevo-deep p-5 sm:p-6 z-10 animate-in zoom-in-95 duration-150 space-y-5">
        {/* Top Icon & Close Button */}
        <div className="flex items-start justify-between gap-4">
          <div
            className={cn(
              "w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 shadow-xevo-brutal",
              current.bgColor,
              current.borderColor,
              current.iconColor
            )}
          >
            <IconComponent className="w-6 h-6" />
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Tutup dialog"
            className="w-9 h-9 rounded-lg border border-xevo-border bg-xevo-panel2 text-xevo-muted hover:text-white hover:border-xevo-red transition-colors flex items-center justify-center touch-manipulation disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3
            id="dialog-title"
            className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug"
          >
            {title}
          </h3>
          <p className="text-xs sm:text-sm font-mono text-xevo-muted leading-relaxed">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={current.buttonVariant}
            size="md"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {loading ? "MEMPROSES..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
