/**
 * Scheduler: autonomous cron-based task execution for enterprise/custom plans.
 *
 * Cloud Scheduler hits the /cron/run-due-tasks endpoint every 60 seconds.
 * This service queries for tasks where next_run <= now and status = 'active',
 * executes each via runWizardForTenant, and computes the next run time.
 */
import { getSupabaseAdminClient } from "../supabase.js";
import { logger } from "../logger.js";

interface ScheduledTaskRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  prompt: string;
  cron_expression: string;
  mcp_servers: string[];
  delivery_channel: string;
}

/**
 * Parse a simple cron expression and compute the next run time.
 * For production, replace with a proper cron parser (cron-parser npm package).
 */
function computeNextRun(cronExpression: string, fromDate: Date = new Date()): Date {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) {
    return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
  }

  const [minutePart, hourPart] = parts;

  const minute = minutePart === "*" ? 0 : parseInt(minutePart, 10);
  const hour = hourPart === "*" ? -1 : parseInt(hourPart, 10);

  const next = new Date(fromDate);

  if (hourPart.startsWith("*/")) {
    const interval = parseInt(hourPart.slice(2), 10);
    next.setMinutes(minute, 0, 0);
    next.setHours(next.getHours() + interval);
    if (next <= fromDate) {
      next.setHours(next.getHours() + interval);
    }
    return next;
  }

  if (hour >= 0) {
    next.setUTCHours(hour, minute, 0, 0);
    if (next <= fromDate) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next;
  }

  next.setMinutes(minute, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

/**
 * Query for due tasks and return them.
 */
export async function getDueTasks(): Promise<ScheduledTaskRow[]> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("scheduled_tasks")
    .select("id, tenant_id, user_id, prompt, cron_expression, mcp_servers, delivery_channel")
    .eq("status", "active")
    .lte("next_run", now)
    .limit(50);

  if (error || !data) return [];
  return data as ScheduledTaskRow[];
}

/**
 * Mark a task as completed for this run and schedule the next one.
 */
export async function completeTaskRun(
  taskId: string,
  cronExpression: string,
  result: string,
  success: boolean,
): Promise<void> {
  const admin = getSupabaseAdminClient();
  const nextRun = computeNextRun(cronExpression);

  await admin
    .from("scheduled_tasks")
    .update({
      last_run_at: new Date().toISOString(),
      last_result: result.slice(0, 4000),
      next_run: nextRun.toISOString(),
      status: success ? "active" : "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);
}

/**
 * Create a new scheduled task.
 */
export async function createScheduledTask(input: {
  tenantId: string;
  userId?: string;
  prompt: string;
  cronExpression: string;
  mcpServers?: string[];
  deliveryChannel?: string;
}): Promise<string> {
  const admin = getSupabaseAdminClient();
  const nextRun = computeNextRun(input.cronExpression);

  const { data, error } = await admin
    .from("scheduled_tasks")
    .insert({
      tenant_id: input.tenantId,
      user_id: input.userId ?? null,
      prompt: input.prompt,
      cron_expression: input.cronExpression,
      mcp_servers: input.mcpServers ?? [],
      next_run: nextRun.toISOString(),
      status: "active",
      delivery_channel: input.deliveryChannel ?? "telegram",
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error("Failed to create scheduled task");
  }

  return data.id;
}

/**
 * Process all due tasks. Called by the cron endpoint.
 *
 * Each task is resolved to a tenant config and run through runWizardForTenant.
 * Results are stored and optionally delivered via the specified channel.
 */
export async function processDueTasks(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const tasks = await getDueTasks();
  let succeeded = 0;
  let failed = 0;

  for (const task of tasks) {
    try {
      const admin = getSupabaseAdminClient();
      const { data: tenant } = await admin
        .from("tenants")
        .select("id, plan, status")
        .eq("id", task.tenant_id)
        .single<{ id: string; plan: string; status: string }>();

      if (!tenant || tenant.status !== "active") {
        await completeTaskRun(task.id, task.cron_expression, "Tenant inactive", false);
        failed++;
        continue;
      }

      // Import dynamically to avoid circular dependency
      const { runWizardForTenant } = await import("./wizard-service.js");

      const result = await runWizardForTenant({
        tenant: {
          id: tenant.id,
          plan: tenant.plan,
          status: tenant.status,
        },
        tenantId: task.tenant_id,
        userId: task.user_id ?? undefined,
        prompt: task.prompt,
        channel: (task.delivery_channel ?? "api") as "telegram" | "mobile" | "api",
      });

      await completeTaskRun(task.id, task.cron_expression, result.text, true);
      succeeded++;

      logger.info("scheduled_task_completed", {
        taskId: task.id,
        tenantId: task.tenant_id,
        wizardId: result.wizardId,
        costUsd: result.costUsd,
      });
    } catch (error) {
      await completeTaskRun(
        task.id,
        task.cron_expression,
        error instanceof Error ? error.message : "unknown_error",
        false,
      );
      failed++;

      logger.error("scheduled_task_failed", {
        taskId: task.id,
        tenantId: task.tenant_id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return { processed: tasks.length, succeeded, failed };
}
