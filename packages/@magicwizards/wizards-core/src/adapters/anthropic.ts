import type {
  ModelTarget,
  RuntimeAdapter,
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
  if (!event || typeof event !== "object") {
    return null;
  }
  const record = event as Record<string, unknown>;
  // SDKResultMessage: { type: 'result', result: string, ... }
  if (record.type === "result" && typeof record.result === "string") {
    return record.result;
  }
  return null;
}

function extractApproxCost(event: unknown): number {
  if (!event || typeof event !== "object") {
    return 0;
  }
  const record = event as Record<string, unknown>;
  // SDKResultMessage uses total_cost_usd
  const cost = record.total_cost_usd ?? record.cost_usd ?? record.costUsd;
  if (typeof cost === "number") {
    return cost;
  }
  return 0;
}

export class AnthropicAdapter implements RuntimeAdapter {
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

    let text = "";
    let totalCost = 0;
    for await (const event of query({
      prompt: buildPrompt(request),
      options: {
        model: target.model,
        maxTurns: request.maxTurns ?? request.wizard.maxTurns,
        maxBudgetUsd: request.maxBudgetUsd ?? request.wizard.maxBudgetUsd,
        // Disable built-in Claude Code tools — pure chat only
        tools: [],
        persistSession: false,
      },
    })) {
      totalCost += extractApproxCost(event);
      const result = extractResultText(event);
      if (result) {
        text = result;
      }
    }

    return {
      text: text || "No result returned by Anthropic runtime.",
      provider: "anthropic",
      model: target.model,
      usage: {
        costUsd: totalCost,
      },
    };
  }
}
