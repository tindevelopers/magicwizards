"use server";

import { createClient } from "@/core/database/server";
import { headers } from "next/headers";

async function getResetRedirectBaseUrl(): Promise<string> {
  // 1. Prefer explicit config (best for production deployments)
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    "";
  if (configured) return configured.replace(/\/$/, "");

  // 2. Vercel environment variables (automatically set by Vercel)
  // VERCEL_URL is set for preview deployments, use https
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl && !vercelUrl.startsWith("http")) {
    return `https://${vercelUrl}`.replace(/\/$/, "");
  }
  if (vercelUrl) return vercelUrl.replace(/\/$/, "");

  // 3. Derive from the current request (works for Vercel production + localhost)
  const h = await headers();
  const origin = h.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");

  const proto = (h.get("x-forwarded-proto") || "http").trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").trim();
  if (host) {
    // Ensure https for Vercel deployments
    const protocol = process.env.VERCEL === "1" ? "https" : proto;
    return `${protocol}://${host}`.replace(/\/$/, "");
  }

  // 4. Localhost fallback (development only)
  return "http://localhost:3000";
}

/**
 * Send password reset email (for forgot password)
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const baseUrl = await getResetRedirectBaseUrl();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/reset-password-confirm`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send password reset email" 
    };
  }
}

/**
 * Update password (for authenticated users changing their password)
 */
export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update password" 
    };
  }
}

/**
 * Reset password with token (for password reset flow)
 */
export async function resetPasswordWithToken(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to reset password" 
    };
  }
}


