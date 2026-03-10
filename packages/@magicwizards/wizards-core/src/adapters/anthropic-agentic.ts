/**
 * Enterprise-tier adapter: Anthropic Agent SDK (@anthropic-ai/claude-agent-sdk).
 *
 * Features: native mcpServers, allowedTools, canUseTool for guardrails,
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

type QueryFn = (params: {
  prompt: string;
  options?: Record<string, unknown>;
}) => AsyncIterable<unknown>;

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
  // SDKResultMessage: { type: 'result', result: string, ... }
  if (record.type === "result" && typeof record.result === "string") {
    return record.result;
  }
  return null;
}

function extractCostUsd(event: unknown): number {
  if (!event || typeof event !== "object") return 0;
  const record = event as Record<string, unknown>;
  // SDKResultMessage uses total_cost_usd
  const cost = record.total_cost_usd ?? record.cost_usd ?? record.costUsd;
  return typeof cost === "number" ? cost : 0;
}

/**
 * Build MCP server configs as a Record keyed by server name.
 * SDK Options.mcpServers expects: Record<string, McpServerConfig>
 */
function buildMcpServerConfigs(
  servers: TenantMcpServer[],
): Record<string, { type: "http"; url: string }> {
  return Object.fromEntries(
    servers.map((s) => [s.name, { type: "http" as const, url: s.url }]),
  );
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

    const options: Record<string, unknown> = {
      model: target.model,
      maxTurns: request.maxTurns ?? request.wizard.maxTurns,
      maxBudgetUsd: budgetUsd,
      // Disable built-in Claude Code filesystem tools; only allow MCP tools
      tools: [],
      persistSession: false,
    };

    // Session resume: pass conversationId for native Agent SDK continuity
    const conversationId = request.context.conversationId;
    if (conversationId) {
      options.resume = conversationId;
    }

    if (mcpServers.length > 0) {
      options.mcpServers = buildMcpServerConfigs(mcpServers);
      options.allowedTools = buildAllowedToolsList(mcpServers);
    }

    if (profile) {
      options.canUseTool = async (
        toolName: string,
        toolInput: Record<string, unknown>,
      ) => {
        const serverName = extractServerName(toolName);
        const tool = extractToolName(toolName);
        const decision = evaluateToolCall(serverName, tool, profile.approvalMode);

        if (decision === "block") {
          return {
            behavior: "deny" as const,
            message: "Destructive operations are blocked.",
            interrupt: false,
          };
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
            return {
              behavior: "deny" as const,
              message: `User ${result.decision} the action.`,
              interrupt: true,
            };
          }
        }

        return { behavior: "allow" as const, updatedInput: {} };
      };
    }

    let text = "";
    let totalCost = 0;
    try {
      for await (const event of query({
        prompt: buildPrompt(request),
        options,
      })) {
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
