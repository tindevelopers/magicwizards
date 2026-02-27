import type {
  ModelTarget,
  ResolvedModelDecision,
  WizardRunRequest,
} from "./types.js";

const HIGH_COMPLEXITY_WORDS = [
  "analyze",
  "architecture",
  "refactor",
  "security",
  "compliance",
  "compare",
  "tradeoff",
  "optimize",
  "multi-tenant",
  "migration",
  "policy",
];

function hasHighComplexity(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return HIGH_COMPLEXITY_WORDS.some((word) => lower.includes(word));
}

function isLongContext(request: WizardRunRequest): boolean {
  const historyChars = (request.history ?? []).reduce(
    (acc, message) => acc + message.content.length,
    0,
  );
  return historyChars > 9000;
}

function isHighRisk(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return (
    lower.includes("delete") ||
    lower.includes("billing") ||
    lower.includes("production") ||
    lower.includes("security") ||
    lower.includes("rbac") ||
    lower.includes("rls")
  );
}

export function resolveModelForRequest(
  request: WizardRunRequest,
): ResolvedModelDecision {
  if (request.preferredProvider && request.preferredModel) {
    return {
      target: {
        provider: request.preferredProvider,
        model: request.preferredModel,
      },
      reason: "explicit_override",
    };
  }

  if (request.preferredProvider) {
    const chosen: ModelTarget = {
      provider: request.preferredProvider,
      model:
        request.preferredProvider === request.wizard.defaultModelPolicy.standard.provider
          ? request.wizard.defaultModelPolicy.standard.model
          : request.wizard.defaultModelPolicy.cheap.model,
    };
    return { target: chosen, reason: "preferred_provider" };
  }

  const prompt = request.prompt;
  if (isHighRisk(prompt)) {
    const escalation = request.wizard.defaultModelPolicy.escalation.find(
      (rule) => rule.when === "high_risk",
    );
    if (escalation) {
      return { target: escalation.target, reason: "high_risk_escalation" };
    }
    return {
      target: request.wizard.defaultModelPolicy.premium,
      reason: "high_risk_premium",
    };
  }

  if (isLongContext(request)) {
    const escalation = request.wizard.defaultModelPolicy.escalation.find(
      (rule) => rule.when === "long_context",
    );
    if (escalation) {
      return { target: escalation.target, reason: "long_context_escalation" };
    }
  }

  if (hasHighComplexity(prompt)) {
    const escalation = request.wizard.defaultModelPolicy.escalation.find(
      (rule) => rule.when === "high_complexity",
    );
    if (escalation) {
      return { target: escalation.target, reason: "high_complexity_escalation" };
    }
    return {
      target: request.wizard.defaultModelPolicy.standard,
      reason: "high_complexity_standard",
    };
  }

  return {
    target: request.wizard.defaultModelPolicy.cheap,
    reason: "cheap_default",
  };
}
