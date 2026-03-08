import {
  AnthropicAdapter,
  AnthropicAgenticAdapter,
  BuilderWizard,
  DEFAULT_WIZARDS,
  GoogleAdapter,
  MockAdapter,
  OpenAIAdapter,
  OpenAIChatAdapter,
  OpenAIAgentsAdapter,
  WizardRuntime,
  getTenantCostProfile,
  filterMcpServersByPlan,
  TraceCollector,
  type WizardDefinition,
  type TenantMcpServer,
} from "@magicwizards/wizards-core";
import { appConfig } from "../config.js";
import { logger } from "../logger.js";
import type { TenantConfig } from "../types.js";
import { getMemoryContext, saveMemory } from "./memory-service.js";
import { getMcpServersForTenant } from "./mcp-service.js";
import { resolveTelephonyProvider } from "./telephony-adapter.js";
import {
  classifyIntent,
  shouldUseOrchestrator,
} from "./orchestrator.js";
import { completeWizardSession, createWizardSession } from "./session-store.js";
import { getSemanticMemoryContext, processSemanticExtraction } from "./semantic-memory.js";
import { getEpisodicMemoryContext, processEpisodicExtraction } from "./episodic-memory.js";
import { getWorkingMemoryContext, appendSessionMessage } from "./working-memory.js";
import {
  TenantBudgetExceededError,
  checkBudgetLimit,
  recordUsage,
} from "./usage-service.js";

// Legacy provider-based adapters (backwards compatibility)
const runtime = new WizardRuntime([
  new AnthropicAdapter(),
  new OpenAIAdapter(),
  new GoogleAdapter(),
  new MockAdapter(),
]);

// Register SDK-tier adapters for plan-based dispatch
runtime.registerSdkAdapter("anthropic-agentic", new AnthropicAgenticAdapter());
runtime.registerSdkAdapter("openai-agents", new OpenAIAgentsAdapter());
runtime.registerSdkAdapter("openai-chat", new OpenAIChatAdapter());

function pickWizard(id: string): WizardDefinition {
  return DEFAULT_WIZARDS[id] ?? BuilderWizard;
}

function extractWizardIdFromPrompt(input: string): {
  wizardId: string;
  prompt: string;
  usedOrchestrator?: boolean;
} {
  if (input.startsWith("/wizard ")) {
    const [, candidate = "", ...rest] = input.split(" ");
    const prompt = rest.join(" ").trim();
    return {
      wizardId: candidate || appConfig.telegram.defaultWizardId,
      prompt: prompt || "Continue with the prior context.",
    };
  }
  return { wizardId: appConfig.telegram.defaultWizardId, prompt: input };
}

export async function runWizardForTenant(input: {
  tenant: TenantConfig;
  tenantId: string;
  userId?: string;
  externalUserRef?: string;
  prompt: string;
  channel: "telegram" | "mobile" | "api";
  /** Channel-specific metadata (e.g. telegramChatId for Telegram approval messages). */
  channelMetadata?: { telegramChatId?: number };
  /** When true, skip session/usage/memory/budget persistence (e.g. for dev __mock__ tenant). */
  skipPersistence?: boolean;
}): Promise<{ text: string; wizardId: string; costUsd: number; turns: number }> {
  const profile = getTenantCostProfile(input.tenant.plan);
  const trimmedPrompt = input.prompt.trim();

  let wizardId: string;
  let prompt: string;

  if (
    shouldUseOrchestrator(trimmedPrompt, profile.runtimeMode) &&
    !trimmedPrompt.startsWith("/wizard ")
  ) {
    const classification = await classifyIntent(trimmedPrompt);
    wizardId = classification.wizard;
    prompt = trimmedPrompt;
    logger.info("orchestrator_routed", {
      wizardId,
      reason: classification.reason,
    });
  } else {
    const extracted = extractWizardIdFromPrompt(trimmedPrompt);
    wizardId = extracted.wizardId;
    prompt = extracted.prompt;
  }

  const wizard = pickWizard(wizardId);
  const skipPersistence = input.skipPersistence === true;

  if (!skipPersistence) {
    await checkBudgetLimit(input.tenantId, input.tenant.plan);
  }

  const sessionId = skipPersistence
    ? ""
    : await createWizardSession({
        tenantId: input.tenantId,
        userId: input.userId,
        wizardId: wizard.id,
        channel: input.channel,
      });

  const traceCollector = new TraceCollector({
    tenantId: input.tenantId,
    userId: input.userId,
    sessionId: sessionId || "ephemeral",
    wizardId: wizard.id,
    channel: input.channel,
  });

  try {
    const usesAdvancedMemory =
      profile.runtimeMode === "agentic" || profile.runtimeMode === "function_calling";

    // Build memory context based on plan tier
    let memoryContext = "";
    if (!skipPersistence) {
      if (usesAdvancedMemory && input.userId) {
        const [semanticCtx, episodicCtx, workingCtx] = await Promise.all([
          getSemanticMemoryContext({
            tenantId: input.tenantId,
            userId: input.userId,
            query: prompt,
          }),
          getEpisodicMemoryContext({
            tenantId: input.tenantId,
            userId: input.userId,
            query: prompt,
          }),
          sessionId
            ? getWorkingMemoryContext(sessionId)
            : Promise.resolve(""),
        ]);

        const parts = [semanticCtx, episodicCtx, workingCtx].filter(Boolean);
        memoryContext = parts.length > 0 ? parts.join("\n\n") : "";
      } else {
        memoryContext = await getMemoryContext(input.tenantId, input.userId);
      }
    }

    const combinedPrompt = memoryContext
      ? `${memoryContext}\n\nUser request:\n${prompt}`
      : prompt;

    // Resolve MCP servers
    let mcpServers: TenantMcpServer[] = [];
    if (profile.allowedMcpServers.length > 0) {
      const allServers = await getMcpServersForTenant(input.tenantId);
      mcpServers = filterMcpServersByPlan(allServers, profile);

      // Inject built-in telephony MCP when plan allows and tenant has telephony configured
      const telephonyAllowed =
        profile.allowedMcpServers.includes("telephony") ||
        profile.allowedMcpServers.includes("*");
      if (telephonyAllowed) {
        const telephonyResolved = await resolveTelephonyProvider(
          input.tenantId,
          input.userId,
        );
        if (telephonyResolved) {
          const baseUrl =
            appConfig.publicBaseUrl ||
            `http://localhost:${appConfig.port}`;
          mcpServers = [
            ...mcpServers,
            {
              type: "url",
              name: "telephony",
              url: `${baseUrl}/mcp/telephony/${input.tenantId}`,
            },
          ];
        }
      }

      // Inject outreach MCP servers when plan allows
      const outreachMcpNames = ["lead-discovery", "email-outreach", "campaign-tracker"] as const;
      const baseUrl =
        appConfig.publicBaseUrl || `http://localhost:${appConfig.port}`;
      for (const mcpName of outreachMcpNames) {
        const allowed =
          profile.allowedMcpServers.includes(mcpName) ||
          profile.allowedMcpServers.includes("*");
        if (allowed) {
          mcpServers = [
            ...mcpServers,
            {
              type: "url",
              name: mcpName,
              url: `${baseUrl}/mcp/${mcpName}/${input.tenantId}`,
            },
          ];
        }
      }
    }

    // Store user message in working memory
    if (!skipPersistence && sessionId) {
      await appendSessionMessage(sessionId, { role: "user", content: prompt });
    }

    const runStartedAt = Date.now();
    const result = await runtime.run({
      wizard,
      prompt: combinedPrompt,
      context: {
        tenantId: input.tenantId,
        userId: input.userId,
        channel: input.channel,
        conversationId: sessionId || undefined,
        metadata: input.channelMetadata,
      },
      costProfile: profile,
      mcpServers,
      traceCollector,
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
      // Cap turns for Telegram so replies return in seconds, not 60–90s
      maxTurns:
        input.channel === "telegram"
          ? Math.min(3, profile.maxTurnsOverride ?? wizard.maxTurns)
          : profile.maxTurnsOverride ?? wizard.maxTurns,
    });

    traceCollector.recordLlmCall({
      provider: result.provider,
      model: result.model,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      costUsd: result.usage.costUsd,
      latencyMs: Date.now() - runStartedAt,
      startedAt: new Date(runStartedAt),
    });
    const trace = traceCollector.complete("completed");
    logger.info("wizard_trace", {
      traceId: trace.traceId,
      tenantId: input.tenantId,
      wizardId: wizard.id,
      sessionId,
      totalCostUsd: trace.totalCostUsd,
      durationMs: trace.totalDurationMs,
    });

    if (!skipPersistence) {
      // Store assistant message in working memory
      if (sessionId) {
        await appendSessionMessage(sessionId, {
          role: "assistant",
          content: result.text,
        });
      }

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

      // Legacy memory (all tiers)
      await saveMemory({
        tenantId: input.tenantId,
        userId: input.userId,
        externalUserRef: input.externalUserRef,
        content: `User asked: ${prompt.slice(0, 600)}\nAssistant replied: ${result.text.slice(0, 600)}`,
        importanceScore: 1,
      });

      // Advanced memory extraction (professional + enterprise tiers)
      if (usesAdvancedMemory && input.userId) {
        const conversation = `User: ${prompt}\nAssistant: ${result.text}`;
        processSemanticExtraction({
          tenantId: input.tenantId,
          userId: input.userId,
          conversation,
          sessionId,
        }).catch((err) =>
          logger.error("semantic_extraction_bg_failed", {
            error: err instanceof Error ? err.message : "unknown",
          }),
        );

        processEpisodicExtraction({
          tenantId: input.tenantId,
          userId: input.userId,
          prompt,
          result: result.text,
          toolsUsed: [],
          sessionId,
        }).catch((err) =>
          logger.error("episodic_extraction_bg_failed", {
            error: err instanceof Error ? err.message : "unknown",
          }),
        );
      }
    }

    return {
      text: result.text,
      wizardId: wizard.id,
      costUsd: result.usage.costUsd,
      turns: 1,
    };
  } catch (error) {
    if (traceCollector) {
      traceCollector.complete("failed");
      logger.info("wizard_trace", {
        traceId: traceCollector.traceId,
        tenantId: input.tenantId,
        wizardId: wizard.id,
        sessionId,
        status: "failed",
      });
    }
    if (!skipPersistence) {
      await completeWizardSession({
        sessionId,
        totalCostUsd: 0,
        turnCount: 0,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      });
    }

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
