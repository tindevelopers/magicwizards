import {
  AnthropicAdapter,
  BuilderWizard,
  DEFAULT_WIZARDS,
  GoogleAdapter,
  MockAdapter,
  OpenAIAdapter,
  WizardRuntime,
  getTenantCostProfile,
  type WizardDefinition,
} from "@magicwizards/wizards-core";
import { appConfig } from "../config.js";
import { logger } from "../logger.js";
import type { TenantConfig } from "../types.js";
import { getMemoryContext, saveMemory } from "./memory-service.js";
import { completeWizardSession, createWizardSession } from "./session-store.js";
import {
  TenantBudgetExceededError,
  checkBudgetLimit,
  recordUsage,
} from "./usage-service.js";

const runtime = new WizardRuntime([
  new AnthropicAdapter(),
  new OpenAIAdapter(),
  new GoogleAdapter(),
  new MockAdapter(),
]);

function pickWizard(id: string): WizardDefinition {
  return DEFAULT_WIZARDS[id] ?? BuilderWizard;
}

function extractWizardIdFromPrompt(input: string): { wizardId: string; prompt: string } {
  if (!input.startsWith("/wizard ")) {
    return { wizardId: appConfig.telegram.defaultWizardId, prompt: input };
  }

  const [, candidate = "", ...rest] = input.split(" ");
  const prompt = rest.join(" ").trim();
  return {
    wizardId: candidate || appConfig.telegram.defaultWizardId,
    prompt: prompt || "Continue with the prior context.",
  };
}

export async function runWizardForTenant(input: {
  tenant: TenantConfig;
  tenantId: string;
  userId?: string;
  externalUserRef?: string;
  prompt: string;
  channel: "telegram" | "mobile" | "api";
}): Promise<{ text: string; wizardId: string; costUsd: number; turns: number }> {
  const { wizardId, prompt } = extractWizardIdFromPrompt(input.prompt.trim());
  const wizard = pickWizard(wizardId);

  await checkBudgetLimit(input.tenantId, input.tenant.plan);

  const sessionId = await createWizardSession({
    tenantId: input.tenantId,
    userId: input.userId,
    wizardId: wizard.id,
    channel: input.channel,
  });

  try {
    const memoryContext = await getMemoryContext(input.tenantId, input.userId);
    const combinedPrompt = memoryContext
      ? `${memoryContext}\n\nUser request:\n${prompt}`
      : prompt;

    const profile = getTenantCostProfile(input.tenant.plan);
    const result = await runtime.run({
      wizard,
      prompt: combinedPrompt,
      context: {
        tenantId: input.tenantId,
        userId: input.userId,
        channel: input.channel,
      },
      preferredProvider:
        (input.tenant.wizardProvider as
          | "anthropic"
          | "openai"
          | "google"
          | "mistral"
          | "together"
          | "fireworks"
          | "groq"
          | "ollama"
          | "mock"
          | undefined) ?? profile.preferredProviders[0],
      preferredModel: input.tenant.wizardModel ?? appConfig.runtime.defaultModel,
      maxBudgetUsd: input.tenant.wizardBudgetUsd ?? wizard.maxBudgetUsd,
      maxTurns: wizard.maxTurns,
    });

    await completeWizardSession({
      sessionId,
      totalCostUsd: result.usage.costUsd,
      turnCount: 1,
      status: "completed",
      outputText: result.text,
    });

    await recordUsage({
      tenantId: input.tenantId,
      sessionId,
      costUsd: result.usage.costUsd,
      turns: 1,
      provider: result.provider,
      model: result.model,
    });

    await saveMemory({
      tenantId: input.tenantId,
      userId: input.userId,
      externalUserRef: input.externalUserRef,
      content: `User asked: ${prompt.slice(0, 600)}\nAssistant replied: ${result.text.slice(0, 600)}`,
      importanceScore: 1,
    });

    return {
      text: result.text,
      wizardId: wizard.id,
      costUsd: result.usage.costUsd,
      turns: 1,
    };
  } catch (error) {
    await completeWizardSession({
      sessionId,
      totalCostUsd: 0,
      turnCount: 0,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });

    if (error instanceof TenantBudgetExceededError) {
      throw error;
    }

    logger.error("wizard_execution_failed", {
      tenantId: input.tenantId,
      wizardId: wizard.id,
      sessionId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    throw error;
  }
}
