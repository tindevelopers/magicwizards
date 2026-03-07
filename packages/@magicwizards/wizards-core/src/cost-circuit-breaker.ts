/**
 * Real-time cost tracking during wizard runs with graduated response:
 * - At 80% budget: signal to downgrade model (e.g. switch to cheaper tier)
 * - At 100% budget: abort execution immediately
 *
 * Each WizardRun creates a CostTracker instance. The adapters call
 * `tracker.recordCost()` after each LLM turn/tool call, and check
 * `tracker.status()` to decide whether to continue, downgrade, or abort.
 */

export type CostStatus = "ok" | "warning" | "exceeded";

export interface CostSnapshot {
  status: CostStatus;
  accumulatedUsd: number;
  budgetUsd: number;
  percentUsed: number;
  turnCount: number;
}

export class BudgetExceededError extends Error {
  public readonly snapshot: CostSnapshot;

  constructor(snapshot: CostSnapshot) {
    super(
      `Budget exceeded: $${snapshot.accumulatedUsd.toFixed(4)} / $${snapshot.budgetUsd.toFixed(2)} (${snapshot.percentUsed.toFixed(1)}%)`,
    );
    this.name = "BudgetExceededError";
    this.snapshot = snapshot;
  }
}

export class CostTracker {
  private accumulatedUsd = 0;
  private turnCount = 0;
  private readonly warningThreshold: number;

  constructor(
    private readonly budgetUsd: number,
    warningPercent = 80,
  ) {
    this.warningThreshold = budgetUsd * (warningPercent / 100);
  }

  /**
   * Record a cost event (LLM call, tool call, etc.).
   * @returns The current cost status after recording.
   * @throws BudgetExceededError if the budget is fully exhausted.
   */
  recordCost(costUsd: number): CostStatus {
    this.accumulatedUsd += costUsd;
    this.turnCount++;

    const snap = this.snapshot();
    if (snap.status === "exceeded") {
      throw new BudgetExceededError(snap);
    }
    return snap.status;
  }

  /**
   * Record a turn without a known cost (cost will be tallied later).
   */
  recordTurn(): void {
    this.turnCount++;
  }

  snapshot(): CostSnapshot {
    const percentUsed =
      this.budgetUsd > 0 ? (this.accumulatedUsd / this.budgetUsd) * 100 : 0;

    let status: CostStatus = "ok";
    if (this.accumulatedUsd >= this.budgetUsd) {
      status = "exceeded";
    } else if (this.accumulatedUsd >= this.warningThreshold) {
      status = "warning";
    }

    return {
      status,
      accumulatedUsd: this.accumulatedUsd,
      budgetUsd: this.budgetUsd,
      percentUsed,
      turnCount: this.turnCount,
    };
  }

  /**
   * Whether the model should be downgraded to a cheaper alternative.
   * Adapters check this after each turn to decide whether to switch models.
   */
  shouldDowngrade(): boolean {
    return this.snapshot().status === "warning";
  }

  /**
   * Whether execution should stop immediately.
   */
  shouldAbort(): boolean {
    return this.accumulatedUsd >= this.budgetUsd;
  }

  getAccumulatedCost(): number {
    return this.accumulatedUsd;
  }

  getTurnCount(): number {
    return this.turnCount;
  }
}
