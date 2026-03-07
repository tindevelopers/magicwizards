/**
 * In-memory store for pending approval requests.
 * Callback handlers resolve/reject the stored promises when the user responds.
 */
import type { ApprovalResult } from "@magicwizards/wizards-core";

interface PendingApproval {
  resolve: (result: ApprovalResult) => void;
  reject: (err: Error) => void;
  expiresAt: number;
}

const pending = new Map<string, PendingApproval>();

const CLEANUP_INTERVAL_MS = 60_000;

function cleanupExpired(): void {
  const now = Date.now();
  for (const [id, p] of pending.entries()) {
    if (now >= p.expiresAt) {
      pending.delete(id);
      p.resolve({
        decision: "timeout",
        approvalId: id,
        decidedAt: new Date(),
      });
    }
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function registerPendingApproval(
  approvalId: string,
  resolve: (result: ApprovalResult) => void,
  reject: (err: Error) => void,
  expiresAt: number,
): void {
  pending.set(approvalId, { resolve, reject, expiresAt });

  const msUntilExpiry = Math.max(0, expiresAt - Date.now());
  setTimeout(() => {
    const p = pending.get(approvalId);
    if (p) {
      pending.delete(approvalId);
      p.resolve({
        decision: "timeout",
        approvalId,
        decidedAt: new Date(),
      });
    }
  }, msUntilExpiry);

  if (!cleanupTimer) {
    cleanupTimer = setInterval(cleanupExpired, CLEANUP_INTERVAL_MS);
  }
}

export function resolveApproval(
  approvalId: string,
  decision: "approved" | "denied",
): boolean {
  const p = pending.get(approvalId);
  if (!p) return false;

  pending.delete(approvalId);
  p.resolve({
    decision,
    approvalId,
    decidedAt: new Date(),
  });
  return true;
}