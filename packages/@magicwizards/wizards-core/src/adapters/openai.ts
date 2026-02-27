import type {
  ModelTarget,
  RuntimeAdapter,
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

export class OpenAIAdapter implements RuntimeAdapter {
  readonly provider = "openai" as const;

  async run(
    request: WizardRunRequest,
    target: ModelTarget,
  ): Promise<WizardRunResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for OpenAI runtime.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: target.model,
        messages: mapMessages(request),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const choices = payload.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = message?.content;

    const usage = payload.usage as Record<string, number> | undefined;

    return {
      text: typeof content === "string" ? content : "No text returned by OpenAI.",
      provider: "openai",
      model: target.model,
      usage: {
        inputTokens: usage?.prompt_tokens,
        outputTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        costUsd: 0,
      },
      raw: payload,
    };
  }
}
