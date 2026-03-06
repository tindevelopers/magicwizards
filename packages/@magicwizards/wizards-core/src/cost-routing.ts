import type {
  ApprovalMode,
  RuntimeMode,
  SdkChoice,
  TenantMcpServer,
  WizardProvider,
} from "./types.js";

export interface TenantCostProfile {
  plan: string;
  monthlyBudgetUsd: number;
  runtimeMode: RuntimeMode;
  sdk: SdkChoice;
  preferredProviders: WizardProvider[];
  allowedMcpServers: string[];
  allowedIntegrations: string[];
  maxTurnsOverride: number;
  allowScheduling: boolean;
  allowPremiumEscalation: boolean;
  approvalMode: ApprovalMode;
}

/**
 * Plan keys match the DB CHECK constraint on tenants.plan:
 * 'starter' | 'professional' | 'enterprise' | 'custom'
 */
const COST_PROFILES: Record<string, TenantCostProfile> = {
  starter: {
    plan: "starter",
    monthlyBudgetUsd: 15,
    runtimeMode: "chat",
    sdk: "openai-chat",
    preferredProviders: ["openai", "mock"],
    allowedMcpServers: [],
    allowedIntegrations: [],
    maxTurnsOverride: 1,
    allowScheduling: false,
    allowPremiumEscalation: false,
    approvalMode: "always",
  },
  professional: {
    plan: "professional",
    monthlyBudgetUsd: 150,
    runtimeMode: "function_calling",
    sdk: "openai-agents",
    preferredProviders: ["openai", "anthropic", "mock"],
    allowedMcpServers: ["web-search"],
    allowedIntegrations: ["gmail"],
    maxTurnsOverride: 6,
    allowScheduling: false,
    allowPremiumEscalation: true,
    approvalMode: "always",
  },
  enterprise: {
    plan: "enterprise",
    monthlyBudgetUsd: 1000,
    runtimeMode: "agentic",
    sdk: "anthropic-agentic",
    preferredProviders: ["anthropic", "openai", "google", "mistral", "mock"],
    allowedMcpServers: [
      "web-search",
      "google-workspace",
      "microsoft-365-mail",
      "hubspot",
      "telephony",
      "salesforce",
    ],
    allowedIntegrations: ["gmail", "outlook", "hubspot", "salesforce"],
    maxTurnsOverride: 20,
    allowScheduling: true,
    allowPremiumEscalation: true,
    approvalMode: "writes-only",
  },
  custom: {
    plan: "custom",
    monthlyBudgetUsd: 5000,
    runtimeMode: "agentic",
    sdk: "anthropic-agentic",
    preferredProviders: ["anthropic", "openai", "google", "mistral", "mock"],
    allowedMcpServers: ["*"],
    allowedIntegrations: ["*"],
    maxTurnsOverride: 50,
    allowScheduling: true,
    allowPremiumEscalation: true,
    approvalMode: "never",
  },
};

export function getTenantCostProfile(plan: string): TenantCostProfile {
  return COST_PROFILES[plan] ?? COST_PROFILES.starter;
}

/**
 * Filter MCP servers to only those the tenant's plan allows.
 * Custom plans with ["*"] get all servers.
 */
export function filterMcpServersByPlan<
  T extends Pick<TenantMcpServer, "name">,
>(servers: T[], profile: TenantCostProfile): T[] {
  if (profile.allowedMcpServers.includes("*")) {
    return servers;
  }
  return servers.filter((s) => profile.allowedMcpServers.includes(s.name));
}
