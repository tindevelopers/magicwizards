import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines and merges Tailwind CSS class names with conditional logic.
 * @example
 * cn("bg-white", isActive && "text-black", "px-4") → "bg-white text-black px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

/**
 * Get the base URL for auth redirects (client-side)
 * Prioritizes environment variables, then falls back to window.location
 * This ensures Vercel deployments use the correct URL
 */
export function getAuthRedirectBaseUrl(): string {
  // 1. Prefer explicit config (best for production deployments)
  if (typeof window !== "undefined") {
    const configured =
      (window as any).__NEXT_PUBLIC_SITE_URL__ ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      "";
    if (configured) return configured.replace(/\/$/, "");

    // 2. Use window.location.origin (works for Vercel production + localhost)
    // On Vercel, this will be the production domain
    if (window.location.origin) {
      return window.location.origin;
    }
  }

  // 3. Fallback to environment variable (for SSR edge cases)
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  // 4. Localhost fallback (development only)
  return "http://localhost:3000";
}
