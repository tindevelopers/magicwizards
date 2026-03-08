/**
 * Orchestrator: classifies user intent with a cheap LLM call and routes
 * to the appropriate specialist wizard.
 *
 * For professional tier (OpenAI Agents SDK), this maps to the handoffs pattern.
 * For enterprise tier (Anthropic Agent SDK), the orchestrator invokes sub-wizards.
 *
 * Users never need to know wizard IDs -- they just send a message and the
 * orchestrator figures out where to route it.
 */
import { logger } from "../logger.js";

export type WizardRoute = "research" | "sales" | "ops" | "builder" | "outreach";

interface ClassificationResult {
  wizard: WizardRoute;
  reason: string;
}

/**
 * Classify user intent using a cheap LLM call.
 * Returns the wizard ID to route to and a reason.
 */
export async function classifyIntent(prompt: string): Promise<ClassificationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { wizard: "builder", reason: "no_api_key_fallback" };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content: `Classify this user request into one of these categories. Return JSON only.

Categories:
- "research": search, find information, compare, look up, analyze data
- "sales": CRM, contacts, leads, deals, pipeline management
- "outreach": find leads, discover contacts, email campaigns, cold outreach, follow-ups, lead generation, prospecting, send emails to prospects, email sequences
- "ops": calling, scheduling, infrastructure, deployment, monitoring
- "builder": code, implementation, development, technical tasks

Return: {"wizard": "<category>", "reason": "<one sentence why>"}`,
          },
          { role: "user", content: prompt.slice(0, 1000) },
        ],
        response_format: { type: "json_object" },
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return { wizard: "builder", reason: "classification_api_error" };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const choices = payload.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = message?.content as string | undefined;

    if (!content) {
      return { wizard: "builder", reason: "no_classification_response" };
    }

    const parsed = JSON.parse(content) as { wizard?: string; reason?: string };
    const validWizards: WizardRoute[] = ["research", "sales", "ops", "builder", "outreach"];
    const wizard = validWizards.includes(parsed.wizard as WizardRoute)
      ? (parsed.wizard as WizardRoute)
      : "builder";

    return { wizard, reason: parsed.reason ?? "classified" };
  } catch (error) {
    logger.error("intent_classification_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return { wizard: "builder", reason: "classification_exception" };
  }
}

/**
 * Determine whether the orchestrator should be used for this request.
 * Orchestrator is used for professional and enterprise tiers when the user
 * doesn't explicitly specify a wizard via /wizard command.
 */
export function shouldUseOrchestrator(
  prompt: string,
  runtimeMode: string,
): boolean {
  if (prompt.startsWith("/wizard ")) return false;
  return runtimeMode === "function_calling" || runtimeMode === "agentic";
}
