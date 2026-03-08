"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button/Button";
import {
  getCurrentTenantWizardPromptSettings,
  updateCurrentTenantWizardPrompt,
  type WizardPromptSetting,
} from "@/app/actions/magic-wizards";

export default function TenantWizardInstructionsCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<WizardPromptSetting[]>([]);
  const [wizardId, setWizardId] = useState("");
  const [instructions, setInstructions] = useState("");

  const selected = useMemo(
    () => rows.find((row) => row.wizardId === wizardId) ?? rows[0],
    [rows, wizardId],
  );

  async function loadRows() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCurrentTenantWizardPromptSettings();
      setRows(data);
      if (data.length > 0) {
        setWizardId((prev) => prev || data[0].wizardId);
        setInstructions((prev) =>
          prev || data[0].additionalInstructions || "",
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load tenant wizard instructions",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateCurrentTenantWizardPrompt(selected.wizardId, instructions);
      await loadRows();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save tenant wizard instructions",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bot Instructions
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Platform owners define core prompts. Tenant owners can append
          additional instructions per bot.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading bot instruction settings...
        </div>
      ) : selected ? (
        <form className="grid gap-3" onSubmit={onSave}>
          <div className="max-w-sm">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Bot
            </label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={selected.wizardId}
              onChange={(e) => {
                const nextId = e.target.value;
                const next = rows.find((row) => row.wizardId === nextId);
                setWizardId(nextId);
                setInstructions(next?.additionalInstructions ?? "");
              }}
            >
              {rows.map((row) => (
                <option key={row.wizardId} value={row.wizardId}>
                  {row.wizardName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Core prompt (read-only)
            </label>
            <textarea
              className="min-h-[110px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              value={selected.corePrompt}
              readOnly
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Tenant additional instructions
            </label>
            <textarea
              className="min-h-[130px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add instructions that are appended to the core prompt for this bot."
            />
          </div>

          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Saving..." : "Save additional instructions"}
          </Button>
        </form>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No bots found for tenant configuration.
        </div>
      )}
    </div>
  );
}
