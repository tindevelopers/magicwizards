import { resolveModelForRequest } from "./model-policy.js";
import type {
  RuntimeAdapter,
  SdkChoice,
  WizardDefinition,
  WizardRunRequest,
  WizardRunResult,
} from "./types.js";

/**
 * SDK-keyed adapter registry.
 * When a costProfile is present, the runtime dispatches based on the plan's
 * `sdk` field ("openai-chat" | "openai-agents" | "anthropic-agentic").
 * Falls back to provider-based dispatch for backwards compatibility.
 */
export class WizardRuntime {
  private readonly adaptersByProvider = new Map<string, RuntimeAdapter>();
  private readonly adaptersBySdk = new Map<SdkChoice, RuntimeAdapter>();

  constructor(adapters: RuntimeAdapter[] = []) {
    adapters.forEach((adapter) => {
      this.adaptersByProvider.set(adapter.provider, adapter);
    });
  }

  registerAdapter(adapter: RuntimeAdapter): void {
    this.adaptersByProvider.set(adapter.provider, adapter);
  }

  /**
   * Register an adapter for a specific SDK tier.
   * This takes priority over provider-based dispatch when a costProfile is present.
   */
  registerSdkAdapter(sdk: SdkChoice, adapter: RuntimeAdapter): void {
    this.adaptersBySdk.set(sdk, adapter);
  }

  getAdapter(provider: string): RuntimeAdapter | undefined {
    return this.adaptersByProvider.get(provider);
  }

  listProviders(): string[] {
    return [...this.adaptersByProvider.keys()];
  }

  async run(request: WizardRunRequest): Promise<WizardRunResult> {
    // Explicit provider selection (tenant/platform override) should bypass plan SDK routing.
    if (request.preferredProvider) {
      const decision = resolveModelForRequest(request);
      const adapter = this.adaptersByProvider.get(decision.target.provider);
      if (adapter) {
        return adapter.run(request, decision.target);
      }
    }

    const profile = request.costProfile;

    if (profile) {
      const sdkAdapter = this.adaptersBySdk.get(profile.sdk);
      if (sdkAdapter) {
        const decision = resolveModelForRequest(request);
        return sdkAdapter.run(request, decision.target);
      }
    }

    const decision = resolveModelForRequest(request);
    const adapter = this.adaptersByProvider.get(decision.target.provider);

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
