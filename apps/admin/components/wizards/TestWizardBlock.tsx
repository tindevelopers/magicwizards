"use client";

import { useState } from "react";
import Button from "@/components/ui/button/Button";

const WIZARD_OPTIONS = [
  { id: "builder", name: "Builder Wizard" },
  { id: "research", name: "Research Wizard" },
  { id: "ops", name: "Ops Wizard" },
  { id: "sales", name: "Sales Wizard" },
] as const;

interface WizardRunResult {
  text: string;
  wizardId: string;
  costUsd: number;
  turns: number;
}

export interface TenantOption {
  value: string;
  label: string;
}

interface TestWizardBlockProps {
  /** When provided, show tenant selector (e.g. admin with __mock__ + tenants). */
  tenantOptions?: TenantOption[];
  selectedTenantId?: string;
  onTenantChange?: (tenantId: string) => void;
}

export default function TestWizardBlock({
  tenantOptions,
  selectedTenantId = "__mock__",
  onTenantChange,
}: TestWizardBlockProps) {
  const [wizardId, setWizardId] = useState<string>("builder");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WizardRunResult | null>(null);

  const effectiveTenantId =
    tenantOptions && tenantOptions.length > 0 && selectedTenantId
      ? selectedTenantId
      : "__mock__";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: { tenantId: string; prompt: string; wizardId?: string } = {
        tenantId: effectiveTenantId,
        prompt: prompt.trim(),
      };
      if (wizardId) body.wizardId = wizardId;

      const res = await fetch("/api/wizards/run-wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Wizard run failed");
        return;
      }

      setResult(data as WizardRunResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Test Wizard
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Run a wizard with a prompt. Uses wizards-api; set WIZARDS_API_URL in
        admin env if not local.
      </p>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        {tenantOptions && tenantOptions.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Tenant
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={selectedTenantId}
              onChange={(e) => onTenantChange?.(e.target.value)}
              required
            >
              {tenantOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Wizard
          </label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            value={wizardId}
            onChange={(e) => setWizardId(e.target.value)}
          >
            {WIZARD_OPTIONS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Prompt
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            rows={3}
            placeholder="e.g. Say hello in one sentence."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>

        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Running…" : "Run wizard"}
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Wizard: {result.wizardId}</span>
            <span>•</span>
            <span>Cost: ${result.costUsd.toFixed(4)}</span>
            <span>•</span>
            <span>Turns: {result.turns}</span>
          </div>
          <div className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
            {result.text}
          </div>
        </div>
      )}
    </section>
  );
}
