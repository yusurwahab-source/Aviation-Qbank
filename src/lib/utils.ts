import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and lets a later Tailwind utility win over an earlier
 * one (`cn("px-4", "px-6")` is `"px-6"`). The shadcn convention, so a
 * component copied into `components/ui/` resolves `@/lib/utils` unchanged.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
