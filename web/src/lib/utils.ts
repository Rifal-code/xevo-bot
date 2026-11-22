import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskPhoneNumber(phone: string): string {
  const clean = String(phone || "").replace(/\D/g, "");
  if (clean.length < 8) return clean;
  return `${clean.slice(0, 4)}••••${clean.slice(-4)}`;
}
