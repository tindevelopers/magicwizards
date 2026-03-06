/**
 * Enterprise-tier adapter: Anthropic Agent SDK (@anthropic-ai/claude-agent-sdk).
 *
 * Features: native mcpServers, allowedTools, PreToolUse hooks for guardrails,
 * session resume, CostTracker integration.
 */
import { CostTracker, BudgetExceededError } from "../cost-circuit-breaker.js";
import { evaluateToolCall, requestToolApproval } from "../approval.js";
import type { TenantCostProfile } from "../cost-routing.js";
import type {
  ModelTarget,
  RuntimeAdapter,
  TenantMcpServer,
  WizardRunRequest,
  WizardRunResult,
} from "../types.js";

type QueryFn = (input: Record<string, unknown>) => AsyncIterable<unknown>;

function buildPrompt(request: WizardRunRequest): string {
  const history = (request.history ?? [])
    .map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`)
    .join("\n");
  return [
    request.wizard.systemPrompt,
    "",
    history ? `Conversation history:\n${history}` : "",
    `User message:\n${request.prompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractResultText(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const record = event as Record<string, unknown>;
  if (record.type === "result") {
    const resultObj = record.result as Record<string, unknown> | undefined;
    const text = resultObj?.result;
    return typeof text === "string" ? text : null;
  }
  return null;
}

function extractCostUsd(event: unknown): number {
  if (!event || typeof event !== "object") return 0;
  const record = event as Record<string, unknown>;
  const cost = record.cost_usd ?? record.costUsd;
  return typeof cost === "number" ? cost : 0;
}

function buildMcpServerConfigs(
  servers: TenantMcpServer[],
): Array<{ type: string; name: string; url: string }> {
  return servers.map((s) => ({
    type: "url",
    name: s.name,
    url: s.url,
  }));
}

function buildAllowedToolsList(servers: TenantMcpServer[]): string[] {
  return servers.map((s) => `mcp__${s.name}__*`);
}

export class AnthropicAgenticAdapter implements RuntimeAdapter {
  readonly provider = "anthropic" as const;

  async run(
    request: WizardRunRequest,
    target: ModelTarget,
  ): Promise<WizardRunResult> {
    const sdk = await import("@anthropic-ai/claude-agent-sdk");
    const query = (sdk as unknown as { query?: QueryFn }).query;
    if (!query) {
      throw new Error("Anthropic SDK query function is unavailable.");
    }

    const profile = request.costProfile;
    const mcpServers = request.mcpServers ?? [];
    const budgetUsd = request.maxBudgetUsd ?? request.wizard.maxBudgetUsd;
    const costTracker = new CostTracker(budgetUsd);

    const input: Record<string, unknown> = {
      prompt: buildPrompt(request),
      maxTurns: request.maxTurns ?? request.wizard.maxTurns,
      max_budget_usd: budgetUsd,
      model: target.model,
    };

    // Session resume: pass conversationId when available for native Agent SDK continuity
    const conversationId = request.context.conversationId;
    if (conversationId) {
      input.resume = conversationId;
    }

    if (mcpServers.length > 0) {
      input.mcpServers = buildMcpServerConfigs(mcpServers);
      input.allowedTools = buildAllowedToolsList(mcpServers);
    }

    if (profile) {
      input.hooks = {
        preToolUse: async (toolName: string, toolInput: Record<string, unknown>) => {
          const serverName = extractServerName(toolName);
          const tool = extractToolName(toolName);
          const decision = evaluateToolCall(serverName, tool, profile.approvalMode);

          if (decision === "block") {
            return { permissionDecision: "deny", reason: "Destructive operations are blocked." };
          }

          if (decision === "approve" && request.context.channel) {
            const result = await requestToolApproval({
              tenantId: request.context.tenantId,
              userId: request.context.userId,
              sessionId: request.context.conversationId ?? "",
              mcpServer: serverName,
              toolName: tool,
              toolInput,
              channel: request.context.channel as "telegram" | "portal" | "api",
              channelMetadata: request.context.metadata,
            });
            if (result.decision !== "approved") {
              return { permissionDecision: "deny", reason: `User ${result.decision} the action.` };
            }
          }

          return { permissionDecision: "allow" };
        },
      };
    }

    let text = "";
    let totalCost = 0;
    try {
      for await (const event of query(input)) {
        const eventCost = extractCostUsd(event);
        if (eventCost > 0) {
          totalCost += eventCost;
          costTracker.recordCost(eventCost);
        }
        const result = extractResultText(event);
        if (result) {
          text = result;
        }
      }
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return {
          text: text || `[Budget exceeded at $${error.snapshot.accumulatedUsd.toFixed(4)}]`,
          provider: "anthropic",
          model: target.model,
          usage: { costUsd: error.snapshot.accumulatedUsd },
        };
      }
      throw error;
    }

    return {
      text: text || "No result returned by Anthropic agentic runtime.",
      provider: "anthropic",
      model: target.model,
      usage: { costUsd: totalCost },
    };
  }
}

/** Extract MCP server name from Anthropic tool format: mcp__serverName__toolName */
function extractServerName(toolName: string): string {
  const parts = toolName.split("__");
  return parts.length >= 2 ? parts[1] : toolName;
}

function extractToolName(toolName: string): string {
  const parts = toolName.split("__");
  return parts.length >= 3 ? parts.slice(2).join("__") : toolName;
}
