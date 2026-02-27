import type { WizardDefinition } from "./types.js";

const sharedEscalation = [
  {
    when: "high_complexity" as const,
    target: {
      provider: "anthropic" as const,
      model: "claude-sonnet-4",
    },
  },
  {
    when: "long_context" as const,
    target: {
      provider: "anthropic" as const,
      model: "claude-sonnet-4",
    },
  },
  {
    when: "high_risk" as const,
    target: {
      provider: "anthropic" as const,
      model: "claude-opus-4.1",
    },
  },
];

export const ResearchWizard: WizardDefinition = {
  id: "research",
  name: "Research Wizard",
  description: "Deep research with citations and explicit uncertainty handling.",
  systemPrompt:
    "You are Research Wizard. Search broadly, compare sources, cite clearly, and flag uncertainty.",
  allowedTools: ["web-search", "browser", "fetch"],
  maxTurns: 16,
  maxBudgetUsd: 1.25,
  defaultModelPolicy: {
    cheap: { provider: "openai", model: "gpt-4.1-mini" },
    standard: { provider: "anthropic", model: "claude-sonnet-4" },
    premium: { provider: "anthropic", model: "claude-opus-4.1" },
    escalation: sharedEscalation,
  },
};

export const BuilderWizard: WizardDefinition = {
  id: "builder",
  name: "Builder Wizard",
  description:
    "Implementation-focused wizard for backend and frontend changes with safe defaults.",
  systemPrompt:
    "You are Builder Wizard. Ship clean, secure, testable changes, especially for multi-tenant systems.",
  allowedTools: ["code-edit", "tests", "terminal", "docs"],
  maxTurns: 14,
  maxBudgetUsd: 1.0,
  defaultModelPolicy: {
    cheap: { provider: "openai", model: "gpt-4.1-mini" },
    standard: { provider: "anthropic", model: "claude-sonnet-4" },
    premium: { provider: "anthropic", model: "claude-opus-4.1" },
    escalation: sharedEscalation,
  },
};

export const OpsWizard: WizardDefinition = {
  id: "ops",
  name: "Ops Wizard",
  description:
    "Infrastructure and reliability wizard with emphasis on rollback-safe automation.",
  systemPrompt:
    "You are Ops Wizard. Prioritize reliability, observability, and low-risk operational workflows.",
  allowedTools: ["terminal", "cloud", "metrics", "alerts"],
  maxTurns: 12,
  maxBudgetUsd: 0.9,
  defaultModelPolicy: {
    cheap: { provider: "openai", model: "gpt-4.1-mini" },
    standard: { provider: "anthropic", model: "claude-sonnet-4" },
    premium: { provider: "anthropic", model: "claude-opus-4.1" },
    escalation: sharedEscalation,
  },
};

export const SalesWizard: WizardDefinition = {
  id: "sales",
  name: "Sales Wizard",
  description:
    "Sales and GTM wizard for crisp messaging, qualification, and outreach strategy.",
  systemPrompt:
    "You are Sales Wizard. Be concise, clear, and outcome-focused. Keep messaging practical and measurable.",
  allowedTools: ["crm", "email", "calendar", "docs"],
  maxTurns: 10,
  maxBudgetUsd: 0.65,
  defaultModelPolicy: {
    cheap: { provider: "openai", model: "gpt-4.1-mini" },
    standard: { provider: "anthropic", model: "claude-sonnet-4" },
    premium: { provider: "anthropic", model: "claude-opus-4.1" },
    escalation: sharedEscalation,
  },
};

export const DEFAULT_WIZARDS: Record<string, WizardDefinition> = {
  [ResearchWizard.id]: ResearchWizard,
  [BuilderWizard.id]: BuilderWizard,
  [OpsWizard.id]: OpsWizard,
  [SalesWizard.id]: SalesWizard,
};
