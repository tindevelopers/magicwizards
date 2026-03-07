import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { JobInput } from "./types";

const DEFAULT_MAX_ATTEMPTS = 10;

export async function enqueueJob(
  supabase: SupabaseClient<any>,
  input: JobInput
) {
  const { data, error } = await supabase
    .from("integration_jobs")
    .insert({
      provider_id: input.provider_id,
      tenant_id: input.tenant_id ?? null,
      connection_id: input.connection_id ?? null,
      job_type: input.job_type,
      payload: input.payload ?? {},
      status: "queued",
      run_at: input.run_at ?? new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Serverless-safe job claim. Note: this is "best effort" without explicit DB locks;
 * it relies on single-row update with status guard.
 */
export async function claimNextJob(
  supabase: SupabaseClient<any>,
  options?: { now?: string }
) {
  const now = options?.now ?? new Date().toISOString();

  const { data: candidates, error: listError } = await supabase
    .from("integration_jobs")
    .select("*")
    .eq("status", "queued")
    .lte("run_at", now)
    .order("run_at", { ascending: true })
    .limit(1);

  if (listError) throw listError;
  const job = candidates?.[0];
  if (!job) return null;

  const { data: claimed, error: claimError } = await supabase
    .from("integration_jobs")
    .update({
      status: "running",
      attempts: (job as any).attempts + 1,
    })
    .eq("id", (job as any).id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (claimError) throw claimError;
  return claimed ?? null;
}

export async function completeJob(
  supabase: SupabaseClient<any>,
  jobId: string
) {
  const { error } = await supabase
    .from("integration_jobs")
    .update({ status: "succeeded" })
    .eq("id", jobId);

  if (error) throw error;
}

export async function failJob(
  supabase: SupabaseClient<any>,
  params: {
    jobId: string;
    attempts: number;
    errorMessage: string;
    maxAttempts?: number;
    backoffSeconds?: number;
  }
) {
  const maxAttempts = params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const backoffSeconds = params.backoffSeconds ?? 60;
  const nextRun = new Date(Date.now() + backoffSeconds * 1000).toISOString();

  const nextStatus = params.attempts >= maxAttempts ? "dead" : "queued";
  const update: Record<string, any> = {
    status: nextStatus,
    last_error: params.errorMessage,
  };

  if (nextStatus === "queued") {
    update.run_at = nextRun;
  }

  const { error } = await supabase
    .from("integration_jobs")
    .update(update)
    .eq("id", params.jobId);

  if (error) throw error;
}

