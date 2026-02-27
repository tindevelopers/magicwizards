import type {
  ModelTarget,
  RuntimeAdapter,
  WizardRunRequest,
  WizardRunResult,
} from "../types.js";

function buildPrompt(request: WizardRunRequest): string {
  const history = (request.history ?? [])
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join("\n");
  return `${request.wizard.systemPrompt}\n\n${history}\n\nUser: ${request.prompt}`;
}

export class GoogleAdapter implements RuntimeAdapter {
  readonly provider = "google" as const;

  async run(
    request: WizardRunRequest,
    target: ModelTarget,
  ): Promise<WizardRunResult> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY is required for Google runtime.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${target.model}:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(request) }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google request failed: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const candidates = payload.candidates as Array<Record<string, unknown>> | undefined;
    const first = candidates?.[0];
    const content = first?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as Array<Record<string, unknown>> | undefined;
    const text = parts?.[0]?.text;

    return {
      text: typeof text === "string" ? text : "No text returned by Google runtime.",
      provider: "google",
      model: target.model,
      usage: {
        costUsd: 0,
      },
      raw: payload,
    };
  }
}
