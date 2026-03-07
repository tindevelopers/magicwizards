/**
 * Professional-tier adapter: OpenAI Agents SDK (@openai/agents).
 *
 * Features: MCPServer interface for tool consumption, input guardrails,
 * built-in tracing, handoffs between specialist agents, CostTracker integration.
 *
 * NOTE: This adapter is structured for the @openai/agents SDK.
 * Until the SDK is installed, it falls back to function-calling via the
 * OpenAI Chat Completions API with tool definitions derived from MCP servers.
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

function mapMessages(request: WizardRunRequest): Array<Record<string, string>> {
  const history =
    request.history?.map((message) => ({
      role: message.role,
      content: message.content,
    })) ?? [];
  return [
    { role: "system", content: request.wizard.systemPrompt },
    ...history,
    { role: "user", content: request.prompt },
  ];
}

/**
 * Build OpenAI function definitions from MCP server metadata.
 * Each MCP server's tools are exposed as functions the LLM can call.
 */
function buildToolDefinitions(servers: TenantMcpServer[]): Array<Record<string, unknown>> {
  const tools: Array<Record<string, unknown>> = [];
  for (const server of servers) {
    tools.push({
      type: "function",
      function: {
        name: `${server.name}__invoke`,
        description: `Invoke a tool on the ${server.name} MCP server. Pass the tool name and arguments.`,
        parameters: {
          type: "object",
          properties: {
            tool: { type: "string", description: "The tool name to invoke on this MCP server." },
            arguments: { type: "object", description: "Arguments to pass to the tool." },
          },
          required: ["tool"],
        },
      },
    });
  }
  return tools;
}

export class OpenAIAgentsAdapter implements RuntimeAdapter {
  readonly provider = "openai" as const;

  async run(
    request: WizardRunRequest,
    target: ModelTarget,
  ): Promise<WizardRunResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI Agents runtime.");
    }

    const profile = request.costProfile;
    const mcpServers = request.mcpServers ?? [];
    const budgetUsd = request.maxBudgetUsd ?? request.wizard.maxBudgetUsd;
    const costTracker = new CostTracker(budgetUsd);
    const maxTurns = request.maxTurns ?? request.wizard.maxTurns;

    const messages = mapMessages(request);
    const tools = mcpServers.length > 0 ? buildToolDefinitions(mcpServers) : undefined;

    let text = "";
    let totalCost = 0;
    let turns = 0;

    try {
      while (turns < maxTurns) {
        turns++;
        const body: Record<string, unknown> = {
          model: target.model,
          messages,
        };
        if (tools && tools.length > 0) {
          body.tools = tools;
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI Agents request failed: ${response.status} ${errorText}`);
        }

        const payload = (await response.json()) as Record<string, unknown>;
        const usage = payload.usage as Record<string, number> | undefined;
        const turnCost = estimateCost(target.model, usage);
        totalCost += turnCost;
        costTracker.recordCost(turnCost);

        const choices = payload.choices as Array<Record<string, unknown>> | undefined;
        const choice = choices?.[0];
        const finishReason = choice?.finish_reason as string | undefined;
        const message = choice?.message as Record<string, unknown> | undefined;

        if (!message) break;

        messages.push(message as Record<string, string>);

        if (finishReason === "tool_calls") {
          const toolCalls = message.tool_calls as Array<Record<string, unknown>> | undefined;
          if (!toolCalls) break;

          for (const toolCall of toolCalls) {
            const fn = toolCall.function as Record<string, unknown> | undefined;
            if (!fn) continue;

            const fnName = fn.name as string;
            const fnArgs = typeof fn.arguments === "string"
              ? JSON.parse(fn.arguments)
              : fn.arguments ?? {};

            const serverName = fnName.replace(/__invoke$/, "");
            const toolName = (fnArgs as Record<string, unknown>).tool as string ?? fnName;
            const toolArguments = (fnArgs as Record<string, unknown>).arguments as Record<string, unknown> ?? {};

            if (profile) {
              const decision = evaluateToolCall(serverName, toolName, profile.approvalMode);
              if (decision === "block") {
                messages.push({
                  role: "tool",
                  tool_call_id: toolCall.id as string,
                  content: `Error: Tool "${toolName}" is blocked (destructive operation).`,
                } as unknown as Record<string, string>);
                continue;
              }

              if (decision === "approve") {
                const approvalResult = await requestToolApproval({
                  tenantId: request.context.tenantId,
                  userId: request.context.userId,
                  sessionId: request.context.conversationId ?? "",
                  mcpServer: serverName,
                  toolName,
                  toolInput: toolArguments,
                  channel: request.context.channel as "telegram" | "portal" | "api",
                });
                if (approvalResult.decision !== "approved") {
                  messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id as string,
                    content: `Action denied by user: ${approvalResult.decision}`,
                  } as unknown as Record<string, string>);
                  continue;
                }
              }
            }

            const toolResult = await this.executeMcpTool(
              mcpServers, serverName, toolName, toolArguments,
            );

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id as string,
              content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
            } as unknown as Record<string, string>);
          }

          continue;
        }

        const content = message.content;
        if (typeof content === "string") {
          text = content;
        }
        break;
      }
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return {
          text: text || `[Budget exceeded at $${error.snapshot.accumulatedUsd.toFixed(4)}]`,
          provider: "openai",
          model: target.model,
          usage: { costUsd: error.snapshot.accumulatedUsd },
        };
      }
      throw error;
    }

    return {
      text: text || "No result returned by OpenAI Agents runtime.",
      provider: "openai",
      model: target.model,
      usage: { costUsd: totalCost },
    };
  }

  /**
   * Execute a tool call against an MCP server via HTTP.
   * In production this goes through the token proxy.
   */
  private async executeMcpTool(
    servers: TenantMcpServer[],
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    const server = servers.find((s) => s.name === serverName);
    if (!server) {
      return { error: `MCP server "${serverName}" not found.` };
    }

    try {
      const response = await fetch(server.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: toolName, arguments: args },
          id: crypto.randomUUID(),
        }),
      });

      if (!response.ok) {
        return { error: `MCP server returned ${response.status}` };
      }

      const result = await response.json();
      return (result as Record<string, unknown>).result ?? result;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "MCP call failed" };
    }
  }
}

function estimateCost(model: string, usage: Record<string, number> | undefined): number {
  if (!usage) return 0;
  const input = usage.prompt_tokens ?? 0;
  const output = usage.completion_tokens ?? 0;

  const rates: Record<string, { input: number; output: number }> = {
    "gpt-4.1": { input: 2.0 / 1_000_000, output: 8.0 / 1_000_000 },
    "gpt-4.1-mini": { input: 0.4 / 1_000_000, output: 1.6 / 1_000_000 },
    "gpt-4.1-nano": { input: 0.1 / 1_000_000, output: 0.4 / 1_000_000 },
    "gpt-4o": { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
    "gpt-4o-mini": { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  };

  const rate = rates[model] ?? rates["gpt-4.1-mini"];
  return input * rate.input + output * rate.output;
}
