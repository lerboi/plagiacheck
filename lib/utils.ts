import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Turn a user- or LLM-supplied title into a safe download filename:
 * lowercase, [a-z0-9-_] only, dashes collapsed, capped at 60 chars.
 */
export function sanitizeFilename(name: string | null | undefined, fallback: string): string {
  const cleaned = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return cleaned || fallback
}
