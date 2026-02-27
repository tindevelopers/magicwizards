import type {
  ModelTarget,
  RuntimeAdapter,
  WizardRunRequest,
  WizardRunResult,
} from "../types.js";

export class MockAdapter implements RuntimeAdapter {
  readonly provider = "mock" as const;

  async run(
    request: WizardRunRequest,
    target: ModelTarget,
  ): Promise<WizardRunResult> {
    const snippet = request.prompt.slice(0, 240);
    return {
      text: `[MOCK:${target.model}] ${request.wizard.name} received: ${snippet}`,
      provider: "mock",
      model: target.model,
      usage: {
        costUsd: 0,
      },
    };
  }
}
