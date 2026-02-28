import { Router, type Request, type Response } from "express";
import { getTenantConfig } from "./services/tenant-resolution.js";
import { runWizardForTenant } from "./services/wizard-service.js";
import type { TenantConfig } from "./types.js";

const router = Router();

/** Mock tenant for local testing without DB (development only). */
const MOCK_TENANT: TenantConfig = {
  id: "__mock__",
  plan: "starter",
  status: "active",
  wizardProvider: "mock",
  wizardModel: "mock-model",
  wizardBudgetUsd: 1,
};

interface DevRunWizardBody {
  tenantId: string;
  prompt: string;
  wizardId?: string;
}

/**
 * POST /dev/run-wizard
 * Body: { tenantId: string, prompt: string, wizardId?: string }
 *
 * - Use tenantId: "__mock__" to run with mock LLM (no API keys, no DB tenant needed).
 * - Otherwise tenantId must exist in Supabase tenants and have status "active".
 *
 * Optional wizardId: "builder" | "research" | "ops" | "sales" (default from env or "builder").
 * Prompt can be prefixed with "/wizard <id> " to select wizard.
 */
router.post("/run-wizard", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as DevRunWizardBody;
  const tenantId = body?.tenantId?.trim();
  const prompt = body?.prompt?.trim();

  if (!prompt) {
    res.status(400).json({
      error: "Missing or empty prompt",
      usage: {
        tenantId: "UUID from tenants table, or '__mock__' for mock provider",
        prompt: "User message (optional prefix: /wizard <id> ...)",
        wizardId: "Optional: builder | research | ops | sales",
      },
    });
    return;
  }

  let tenant: TenantConfig;
  let effectiveTenantId: string;

  if (tenantId === "__mock__") {
    tenant = MOCK_TENANT;
    effectiveTenantId = "__mock__";
  } else if (!tenantId) {
    res.status(400).json({
      error: "Missing tenantId. Use '__mock__' for local testing without a DB tenant.",
    });
    return;
  } else {
    const config = await getTenantConfig(tenantId);
    if (!config || config.status !== "active") {
      res.status(404).json({
        error: "Tenant not found or inactive",
        tenantId,
      });
      return;
    }
    tenant = config;
    effectiveTenantId = tenantId;
  }

  const promptWithWizard =
    body.wizardId && !prompt.startsWith("/wizard ")
      ? `/wizard ${body.wizardId} ${prompt}`
      : prompt;

  const skipPersistence = effectiveTenantId === "__mock__";

  try {
    const result = await runWizardForTenant({
      tenant,
      tenantId: effectiveTenantId,
      userId: undefined,
      externalUserRef: undefined,
      prompt: promptWithWizard,
      channel: "api",
      skipPersistence,
    });

    res.json({
      text: result.text,
      wizardId: result.wizardId,
      costUsd: result.costUsd,
      turns: result.turns,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Wizard run failed",
    });
  }
});

export function createDevRouter(): Router {
  return router;
}
