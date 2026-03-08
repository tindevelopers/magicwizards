"use client";

import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import {
  createTelegramIdentity,
  createTenantMcpServer,
  deleteTelegramIdentity,
  deleteTenantMcpServer,
  getTenantOptions,
  listTelegramIdentities,
  listTenantMcpServers,
  toggleTelegramIdentity,
  toggleTenantMcpServer,
  updateTenantWizardDefaults,
  type TelegramIdentityRow,
  type TenantMcpServerRow,
  type TenantOption,
} from "@/app/actions/magic-wizards";
import TestWizardBlock from "@/components/wizards/TestWizardBlock";

export default function MagicWizardsSystemAdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [telegramRows, setTelegramRows] = useState<TelegramIdentityRow[]>([]);
  const [mcpRows, setMcpRows] = useState<TenantMcpServerRow[]>([]);

  const [telegramForm, setTelegramForm] = useState({
    tenantId: "",
    telegramChatId: "",
    telegramUserId: "",
    userId: "",
  });
  const [mcpForm, setMcpForm] = useState({
    tenantId: "",
    serverName: "",
    serverUrl: "",
  });

  const [savingTelegram, setSavingTelegram] = useState(false);
  const [savingMcp, setSavingMcp] = useState(false);
  const [savingWizard, setSavingWizard] = useState(false);
  const [wizardForm, setWizardForm] = useState({
    tenantId: "",
    wizard_provider: "",
    wizard_model: "",
  });
  const [testWizardTenantId, setTestWizardTenantId] = useState("__mock__");

  const tenantMap = useMemo(() => {
    const map = new Map<string, TenantOption>();
    for (const tenant of tenants) {
      map.set(tenant.id, tenant);
    }
    return map;
  }, [tenants]);

  async function loadData() {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards/page.tsx:loadData',message:'loadData called',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      setError(null);

      const [tenantData, telegramData, mcpData] = await Promise.all([
        getTenantOptions(),
        listTelegramIdentities(),
        listTenantMcpServers(),
      ]);
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards/page.tsx:loadData',message:'loadData success',data:{tenantCount:tenantData.length,telegramCount:telegramData.length,mcpCount:mcpData.length},timestamp:Date.now(),runId:'debug-1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      setTenants(tenantData);
      setTelegramRows(telegramData);
      setMcpRows(mcpData);

      if (tenantData.length > 0) {
        setTelegramForm((prev) => ({ ...prev, tenantId: prev.tenantId || tenantData[0].id }));
        setMcpForm((prev) => ({ ...prev, tenantId: prev.tenantId || tenantData[0].id }));
        setWizardForm((prev) => {
          const tid = prev.tenantId || tenantData[0].id;
          const t = tenantData.find((x) => x.id === tid) ?? tenantData[0];
          return {
            tenantId: tid,
            wizard_provider: t.wizard_provider ?? "",
            wizard_model: t.wizard_model ?? "",
          };
        });
        setTestWizardTenantId((prev) =>
          prev === "__mock__" ? "__mock__" : (tenantData.find((t) => t.id === prev) ? prev : tenantData[0].id)
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load Magic Wizards admin data";
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards/page.tsx:loadData',message:'loadData error',data:{errorMessage:message,errorType:err?.constructor?.name},timestamp:Date.now(),runId:'debug-1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      // In production, missing env often surfaces as a generic Server Components error; hint at config.
      const hint =
        message.includes("SUPABASE_SERVICE_ROLE_KEY") || message.includes("NEXT_PUBLIC_SUPABASE_URL")
          ? " Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel for the admin app and redeploy."
          : "";
      setError(message + hint);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function onCreateTelegramIdentity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingTelegram(true);
    setError(null);
    try {
      await createTelegramIdentity({
        tenantId: telegramForm.tenantId,
        telegramChatId: telegramForm.telegramChatId,
        telegramUserId: telegramForm.telegramUserId || undefined,
        userId: telegramForm.userId || undefined,
      });
      setTelegramForm((prev) => ({
        ...prev,
        telegramChatId: "",
        telegramUserId: "",
        userId: "",
      }));
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create Telegram identity");
    } finally {
      setSavingTelegram(false);
    }
  }

  async function onCreateMcpServer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingMcp(true);
    setError(null);
    try {
      await createTenantMcpServer({
        tenantId: mcpForm.tenantId,
        serverName: mcpForm.serverName,
        serverUrl: mcpForm.serverUrl,
      });
      setMcpForm((prev) => ({ ...prev, serverName: "", serverUrl: "" }));
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create MCP server");
    } finally {
      setSavingMcp(false);
    }
  }

  async function onToggleTelegram(id: string, isActive: boolean) {
    setError(null);
    try {
      await toggleTelegramIdentity(id, !isActive);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update Telegram identity");
    }
  }

  async function onDeleteTelegram(id: string) {
    if (!confirm("Remove this Telegram identity permanently? This cannot be undone.")) return;
    setError(null);
    try {
      await deleteTelegramIdentity(id);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete Telegram identity");
    }
  }

  async function onToggleMcp(id: string, enabled: boolean) {
    setError(null);
    try {
      await toggleTenantMcpServer(id, !enabled);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update MCP server");
    }
  }

  async function onDeleteMcp(id: string) {
    setError(null);
    try {
      await deleteTenantMcpServer(id);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete MCP server");
    }
  }

  function onWizardTenantChange(tenantId: string) {
    const t = tenantMap.get(tenantId);
    setWizardForm({
      tenantId,
      wizard_provider: t?.wizard_provider ?? "",
      wizard_model: t?.wizard_model ?? "",
    });
  }

  async function onSaveWizardDefaults(e: React.FormEvent) {
    e.preventDefault();
    if (!wizardForm.tenantId) return;
    setError(null);
    setSavingWizard(true);
    try {
      await updateTenantWizardDefaults(wizardForm.tenantId, {
        wizard_provider: wizardForm.wizard_provider || null,
        wizard_model: wizardForm.wizard_model || null,
      });
      await loadData();
      setWizardForm((prev) => {
        const t = tenantMap.get(prev.tenantId);
        return {
          ...prev,
          wizard_provider: t?.wizard_provider ?? prev.wizard_provider,
          wizard_model: t?.wizard_model ?? prev.wizard_model,
        };
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update wizard defaults");
    } finally {
      setSavingWizard(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Magic Wizards Onboarding" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Magic Wizards Channel Setup
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage tenant Telegram identities and tenant MCP servers in one place so onboarding is click-based.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Loading Magic Wizards configuration...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tenant Telegram Identities
            </h2>
            <form className="grid gap-3" onSubmit={onCreateTelegramIdentity}>
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={telegramForm.tenantId}
                onChange={(e) => setTelegramForm((prev) => ({ ...prev, tenantId: e.target.value }))}
                required
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.domain})
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Telegram chat id (required)"
                value={telegramForm.telegramChatId}
                onChange={(e) =>
                  setTelegramForm((prev) => ({ ...prev, telegramChatId: e.target.value }))
                }
                required
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Telegram user id (optional)"
                value={telegramForm.telegramUserId}
                onChange={(e) =>
                  setTelegramForm((prev) => ({ ...prev, telegramUserId: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Internal user UUID (optional)"
                value={telegramForm.userId}
                onChange={(e) =>
                  setTelegramForm((prev) => ({ ...prev, userId: e.target.value }))
                }
              />
              <Button type="submit" size="sm" disabled={savingTelegram}>
                {savingTelegram ? "Saving..." : "Add Telegram Identity"}
              </Button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="pb-2">Tenant</th>
                    <th className="pb-2">Chat/User</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right min-w-[180px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {telegramRows.map((row) => {
                    const tenant = tenantMap.get(row.tenant_id);
                    return (
                      <tr key={row.id}>
                        <td className="py-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {tenant?.name ?? row.tenants?.name ?? row.tenant_id}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tenant?.domain ?? row.tenants?.domain ?? "unknown"}
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="text-gray-900 dark:text-white">{row.telegram_chat_id}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {row.telegram_user_id ? `user ${row.telegram_user_id}` : "all users in chat"}
                          </div>
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.is_active
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {row.is_active ? "active" : "inactive"}
                          </span>
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onToggleTelegram(row.id, row.is_active)}
                            >
                              {row.is_active ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                              onClick={() => onDeleteTelegram(row.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tenant MCP Servers
            </h2>
            <form className="grid gap-3" onSubmit={onCreateMcpServer}>
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={mcpForm.tenantId}
                onChange={(e) => setMcpForm((prev) => ({ ...prev, tenantId: e.target.value }))}
                required
              >
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.domain})
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Server name (e.g. google-search)"
                value={mcpForm.serverName}
                onChange={(e) => setMcpForm((prev) => ({ ...prev, serverName: e.target.value }))}
                required
              />
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="Server URL (https://...)"
                value={mcpForm.serverUrl}
                onChange={(e) => setMcpForm((prev) => ({ ...prev, serverUrl: e.target.value }))}
                required
              />
              <Button type="submit" size="sm" disabled={savingMcp}>
                {savingMcp ? "Saving..." : "Add MCP Server"}
              </Button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="pb-2">Tenant</th>
                    <th className="pb-2">Server</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mcpRows.map((row) => {
                    const tenant = tenantMap.get(row.tenant_id);
                    return (
                      <tr key={row.id}>
                        <td className="py-2">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {tenant?.name ?? row.tenants?.name ?? row.tenant_id}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {tenant?.domain ?? row.tenants?.domain ?? "unknown"}
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="text-gray-900 dark:text-white">{row.server_name}</div>
                          <div className="max-w-[260px] truncate text-xs text-gray-500 dark:text-gray-400">
                            {row.server_url}
                          </div>
                        </td>
                        <td className="py-2">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              row.enabled
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {row.enabled ? "enabled" : "disabled"}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onToggleMcp(row.id, row.enabled)}
                            >
                              {row.enabled ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onDeleteMcp(row.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tenant wizard defaults
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Override the LLM provider and model for a tenant. Leave blank to use the app default (env). Affects Telegram and API wizard runs.
            </p>
            <form className="grid gap-3 max-w-xl" onSubmit={onSaveWizardDefaults}>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tenant</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={wizardForm.tenantId}
                  onChange={(e) => onWizardTenantChange(e.target.value)}
                  required
                >
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.domain})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wizard provider</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={wizardForm.wizard_provider}
                    onChange={(e) => setWizardForm((prev) => ({ ...prev, wizard_provider: e.target.value }))}
                  >
                    <option value="">App default</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="google">Google</option>
                    <option value="mock">Mock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wizard model</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={wizardForm.wizard_model}
                    onChange={(e) => setWizardForm((prev) => ({ ...prev, wizard_model: e.target.value }))}
                  >
                    <option value="">App default</option>
                    <option value="gpt-4.1-mini">OpenAI gpt-4.1-mini</option>
                    <option value="gpt-4o-mini">OpenAI gpt-4o-mini</option>
                    <option value="claude-sonnet-4">Anthropic claude-sonnet-4</option>
                    <option value="claude-opus-4-5">Anthropic claude-opus-4-5</option>
                    <option value="claude-opus-4-6">Anthropic claude-opus-4-6</option>
                  </select>
                </div>
              </div>
              <Button type="submit" size="sm" disabled={savingWizard}>
                {savingWizard ? "Saving..." : "Save wizard defaults"}
              </Button>
            </form>
          </section>
        </div>
      )}

      <TestWizardBlock
        tenantOptions={[
          { value: "__mock__", label: "Mock (no DB, no LLM keys)" },
          ...tenants.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.domain})`,
          })),
        ]}
        selectedTenantId={testWizardTenantId}
        onTenantChange={setTestWizardTenantId}
      />
    </div>
  );
}
