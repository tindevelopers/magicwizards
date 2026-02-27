export type WizardProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "mistral"
  | "together"
  | "fireworks"
  | "groq"
  | "ollama"
  | "mock";

export type WizardRole = "system" | "user" | "assistant";

export interface WizardMessage {
  role: WizardRole;
  content: string;
}

export interface ModelTarget {
  provider: WizardProvider;
  model: string;
}

export interface ModelEscalationRule {
  when: "high_complexity" | "long_context" | "high_risk";
  target: ModelTarget;
}

export interface ModelPolicy {
  cheap: ModelTarget;
  standard: ModelTarget;
  premium: ModelTarget;
  escalation: ModelEscalationRule[];
}

export interface WizardDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  maxTurns: number;
  maxBudgetUsd: number;
  defaultModelPolicy: ModelPolicy;
}

export interface WizardContext {
  tenantId: string;
  userId?: string;
  workspaceId?: string;
  channel: "telegram" | "mobile" | "api";
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface WizardRunRequest {
  wizard: WizardDefinition;
  context: WizardContext;
  prompt: string;
  history?: WizardMessage[];
  preferredProvider?: WizardProvider;
  preferredModel?: string;
  maxBudgetUsd?: number;
  maxTurns?: number;
}

export interface WizardUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd: number;
}

export interface WizardRunResult {
  text: string;
  provider: WizardProvider;
  model: string;
  usage: WizardUsage;
  externalSessionId?: string;
  raw?: unknown;
}

export interface ResolvedModelDecision {
  target: ModelTarget;
  reason: string;
}

export interface RuntimeAdapter {
  readonly provider: WizardProvider;
  run(request: WizardRunRequest, target: ModelTarget): Promise<WizardRunResult>;
}
