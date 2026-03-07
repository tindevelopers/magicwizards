/**
 * Structured tracing for wizard runs.
 *
 * Each wizard run produces a WizardTrace with:
 * - A unique traceId
 * - LLM call spans (model, tokens, cost, latency)
 * - Tool call spans (MCP server, tool name, latency, success/fail)
 * - Total cost and duration
 *
 * Traces are collected in-memory during a run and persisted to the
 * usage_events / wizard_sessions tables by the wizard-service.
 */

export interface LlmSpan {
  spanId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  startedAt: Date;
}

export interface ToolSpan {
  spanId: string;
  mcpServer: string;
  toolName: string;
  latencyMs: number;
  success: boolean;
  error?: string;
  startedAt: Date;
}

export interface WizardTrace {
  traceId: string;
  tenantId: string;
  userId?: string;
  sessionId: string;
  wizardId: string;
  channel: string;
  llmSpans: LlmSpan[];
  toolSpans: ToolSpan[];
  totalCostUsd: number;
  totalDurationMs: number;
  turnCount: number;
  startedAt: Date;
  completedAt?: Date;
  status: "running" | "completed" | "failed" | "budget_exceeded";
}

export class TraceCollector {
  private readonly trace: WizardTrace;

  constructor(opts: {
    tenantId: string;
    userId?: string;
    sessionId: string;
    wizardId: string;
    channel: string;
  }) {
    this.trace = {
      traceId: crypto.randomUUID(),
      tenantId: opts.tenantId,
      userId: opts.userId,
      sessionId: opts.sessionId,
      wizardId: opts.wizardId,
      channel: opts.channel,
      llmSpans: [],
      toolSpans: [],
      totalCostUsd: 0,
      totalDurationMs: 0,
      turnCount: 0,
      startedAt: new Date(),
      status: "running",
    };
  }

  get traceId(): string {
    return this.trace.traceId;
  }

  recordLlmCall(span: Omit<LlmSpan, "spanId">): void {
    this.trace.llmSpans.push({
      ...span,
      spanId: crypto.randomUUID(),
    });
    this.trace.totalCostUsd += span.costUsd;
    this.trace.turnCount++;
  }

  recordToolCall(span: Omit<ToolSpan, "spanId">): void {
    this.trace.toolSpans.push({
      ...span,
      spanId: crypto.randomUUID(),
    });
  }

  complete(status: WizardTrace["status"] = "completed"): WizardTrace {
    this.trace.completedAt = new Date();
    this.trace.totalDurationMs =
      this.trace.completedAt.getTime() - this.trace.startedAt.getTime();
    this.trace.status = status;
    return { ...this.trace };
  }

  snapshot(): Readonly<WizardTrace> {
    return { ...this.trace };
  }
}
