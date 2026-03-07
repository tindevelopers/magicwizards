import type { ApprovalMode, ToolRiskLevel } from "./types.js";
import { classifyTool, requiresApproval, isToolBlocked } from "./tool-classification.js";

/**
 * Represents a pending approval request sent to the user.
 */
export interface ApprovalRequest {
  id: string;
  tenantId: string;
  userId?: string;
  sessionId: string;
  mcpServer: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  riskLevel: ToolRiskLevel;
  channel: "telegram" | "portal" | "api";
  /** Channel-specific (e.g. telegramChatId for sending approval message). */
  channelMetadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt: Date;
}

export type ApprovalDecision = "approved" | "denied" | "timeout";

export interface ApprovalResult {
  decision: ApprovalDecision;
  approvalId: string;
  decidedAt: Date;
  decidedBy?: string;
}

/**
 * Channel-specific approval handler interface.
 * Each channel (Telegram, Portal, API) implements this to present
 * approval requests in its native format.
 */
export interface ApprovalHandler {
  /**
   * Send an approval request to the user and wait for their decision.
   * Must resolve within the timeout or return "timeout".
   */
  requestApproval(request: ApprovalRequest): Promise<ApprovalResult>;
}

/**
 * Evaluate whether a tool call should proceed, require approval, or be blocked.
 *
 * Returns:
 * - "allow"    -- tool is read-only or plan auto-approves
 * - "approve"  -- tool requires user approval before execution
 * - "block"    -- tool is destructive and always blocked
 */
export type ToolDecision = "allow" | "approve" | "block";

export function evaluateToolCall(
  mcpServer: string,
  toolName: string,
  approvalMode: ApprovalMode,
): ToolDecision {
  const riskLevel = classifyTool(mcpServer, toolName);

  if (isToolBlocked(riskLevel)) {
    return "block";
  }

  if (requiresApproval(riskLevel, approvalMode)) {
    return "approve";
  }

  return "allow";
}

const DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Registry of approval handlers by channel.
 * In production, Telegram and Portal handlers register here at startup.
 */
const handlers = new Map<string, ApprovalHandler>();

export function registerApprovalHandler(
  channel: string,
  handler: ApprovalHandler,
): void {
  handlers.set(channel, handler);
}

export function getApprovalHandler(
  channel: string,
): ApprovalHandler | undefined {
  return handlers.get(channel);
}

/**
 * Request approval for a tool call through the user's active channel.
 * Falls back to "denied" if no handler is registered for the channel.
 */
export async function requestToolApproval(opts: {
  tenantId: string;
  userId?: string;
  sessionId: string;
  mcpServer: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  channel: "telegram" | "portal" | "api";
  channelMetadata?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<ApprovalResult> {
  const handler = handlers.get(opts.channel);
  if (!handler) {
    return {
      decision: "denied",
      approvalId: "",
      decidedAt: new Date(),
    };
  }

  const timeoutMs = opts.timeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS;
  const riskLevel = classifyTool(opts.mcpServer, opts.toolName);
  const now = new Date();

  const request: ApprovalRequest = {
    id: crypto.randomUUID(),
    tenantId: opts.tenantId,
    userId: opts.userId,
    sessionId: opts.sessionId,
    mcpServer: opts.mcpServer,
    toolName: opts.toolName,
    toolInput: opts.toolInput,
    riskLevel,
    channel: opts.channel,
    channelMetadata: opts.channelMetadata,
    createdAt: now,
    expiresAt: new Date(now.getTime() + timeoutMs),
  };

  return handler.requestApproval(request);
}
