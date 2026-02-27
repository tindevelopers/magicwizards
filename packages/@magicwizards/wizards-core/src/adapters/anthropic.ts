import type {
  ModelTarget,
  RuntimeAdapter,
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
  if (!event || typeof event !== "object") {
    return null;
  }

  const record = event as Record<string, unknown>;
  if (record.type === "result") {
    const resultObj = record.result as Record<string, unknown> | undefined;
    const text = resultObj?.result;
    return typeof text === "string" ? text : null;
  }

  return null;
}

function extractApproxCost(event: unknown): number {
  if (!event || typeof event !== "object") {
    return 0;
  }
  const record = event as Record<string, unknown>;
  const cost = record.cost_usd ?? record.costUsd;
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
    const query = (sdk as { query?: QueryFn }).query;
    if (!query) {
      throw new Error("Anthropic SDK query function is unavailable.");
    }

    const input: Record<string, unknown> = {
      prompt: buildPrompt(request),
      maxTurns: request.maxTurns ?? request.wizard.maxTurns,
      max_budget_usd: request.maxBudgetUsd ?? request.wizard.maxBudgetUsd,
      model: target.model,
    };

    let text = "";
    let totalCost = 0;
    for await (const event of query(input)) {
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
