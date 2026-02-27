import type { WizardProvider } from "./types.js";

export interface TenantCostProfile {
  plan: string;
  monthlyBudgetUsd: number;
  preferredProviders: WizardProvider[];
  allowPremiumEscalation: boolean;
}

const COST_PROFILES: Record<string, TenantCostProfile> = {
  free: {
    plan: "free",
    monthlyBudgetUsd: 15,
    preferredProviders: ["openai", "google", "mock"],
    allowPremiumEscalation: false,
  },
  pro: {
    plan: "pro",
    monthlyBudgetUsd: 150,
    preferredProviders: ["anthropic", "openai", "google", "mock"],
    allowPremiumEscalation: true,
  },
  enterprise: {
    plan: "enterprise",
    monthlyBudgetUsd: 1000,
    preferredProviders: ["anthropic", "openai", "google", "mistral", "mock"],
    allowPremiumEscalation: true,
  },
};

export function getTenantCostProfile(plan: string): TenantCostProfile {
  return COST_PROFILES[plan] ?? COST_PROFILES.free;
}
