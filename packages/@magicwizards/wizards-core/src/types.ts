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

export type RuntimeMode = "chat" | "function_calling" | "agentic";

export type SdkChoice = "openai-chat" | "openai-agents" | "anthropic-agentic";

export type ApprovalMode = "always" | "writes-only" | "never";

export type ToolRiskLevel = "read" | "write" | "destructive";

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
  /** Channel-specific data (e.g. telegramChatId for approval inline buttons). */
  metadata?: Record<string, unknown>;
}

export interface TenantMcpServer {
  type: "url";
  name: string;
  url: string;
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
  /** Resolved cost/capability profile for the tenant's plan. */
  costProfile?: import("./cost-routing.js").TenantCostProfile;
  /** MCP servers available to this tenant (already filtered by plan). */
  mcpServers?: TenantMcpServer[];
  /** Optional trace collector for observability (LLM spans, tool spans, cost). */
  traceCollector?: import("./tracing.js").TraceCollector;
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
