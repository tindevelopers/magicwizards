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
  type TelegramIdentityRow,
  type TenantMcpServerRow,
  type TenantOption,
} from "@/app/actions/magic-wizards";

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

  const tenantMap = useMemo(() => {
    const map = new Map<string, TenantOption>();
    for (const tenant of tenants) {
      map.set(tenant.id, tenant);
    }
    return map;
  }, [tenants]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [tenantData, telegramData, mcpData] = await Promise.all([
        getTenantOptions(),
        listTelegramIdentities(),
        listTenantMcpServers(),
      ]);

      setTenants(tenantData);
      setTelegramRows(telegramData);
      setMcpRows(mcpData);

      if (tenantData.length > 0) {
        setTelegramForm((prev) => ({ ...prev, tenantId: prev.tenantId || tenantData[0].id }));
        setMcpForm((prev) => ({ ...prev, tenantId: prev.tenantId || tenantData[0].id }));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load Magic Wizards admin data";
      setError(message);
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
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="pb-2">Tenant</th>
                    <th className="pb-2">Chat/User</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Actions</th>
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
                        <td className="py-2 text-right">
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
                              onClick={() => onDeleteTelegram(row.id)}
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
        </div>
      )}
    </div>
  );
}
