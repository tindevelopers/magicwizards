import { resolveModelForRequest } from "./model-policy.js";
import type {
  RuntimeAdapter,
  WizardDefinition,
  WizardRunRequest,
  WizardRunResult,
} from "./types.js";

export class WizardRuntime {
  private readonly adapters = new Map<string, RuntimeAdapter>();

  constructor(adapters: RuntimeAdapter[] = []) {
    adapters.forEach((adapter) => {
      this.adapters.set(adapter.provider, adapter);
    });
  }

  registerAdapter(adapter: RuntimeAdapter): void {
    this.adapters.set(adapter.provider, adapter);
  }

  getAdapter(provider: string): RuntimeAdapter | undefined {
    return this.adapters.get(provider);
  }

  listProviders(): string[] {
    return [...this.adapters.keys()];
  }

  async run(request: WizardRunRequest): Promise<WizardRunResult> {
    const decision = resolveModelForRequest(request);
    const adapter = this.adapters.get(decision.target.provider);

    if (!adapter) {
      throw new Error(
        `No adapter registered for provider "${decision.target.provider}" (reason: ${decision.reason}).`,
      );
    }

    return adapter.run(request, decision.target);
  }
}

export function getWizardById(
  wizardMap: Record<string, WizardDefinition>,
  wizardId: string,
): WizardDefinition {
  const wizard = wizardMap[wizardId];
  if (!wizard) {
    throw new Error(`Wizard "${wizardId}" is not defined.`);
  }
  return wizard;
}
