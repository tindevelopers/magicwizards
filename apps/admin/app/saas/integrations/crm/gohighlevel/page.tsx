import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentUser } from "@/core/database/user-actions";
import Link from "next/link";
import { ConnectionStore, createSupabaseAdminClient } from "@tinadmin/integrations-core";
import { syncContacts } from "@tinadmin/integration-gohighlevel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GoHighLevelIntegrationPage() {
  const user = await getCurrentUser();
  const admin = createAdminClient();

  const { data: provider } = await (admin as any)
    .from("integration_providers")
    .select("*")
    .eq("slug", "gohighlevel")
    .maybeSingle();

  if (!provider) {
    return (
      <div>
        <PageBreadcrumb pageTitle="GoHighLevel" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          GoHighLevel provider is not installed.
        </p>
      </div>
    );
  }

  const { data: platformSettings } = await (admin as any)
    .from("platform_integration_settings")
    .select("*")
    .eq("provider_id", provider.id)
    .maybeSingle();

  const platformEnabled = platformSettings?.enabled === true;

  const tenantId = user?.tenant_id ?? null;
  const { data: connection } = tenantId
    ? await (admin as any)
        .from("integration_connections")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("provider_id", provider.id)
        .maybeSingle()
    : { data: null as any };

  async function disconnect() {
    "use server";
    if (!user?.tenant_id) throw new Error("Tenant context required");
    const a = createAdminClient();
    const { data: conn } = await (a as any)
      .from("integration_connections")
      .select("*")
      .eq("tenant_id", user.tenant_id)
      .eq("provider_id", provider.id)
      .maybeSingle();
    if (!conn) return;
    await (a as any).from("integration_connection_secrets").delete().eq("connection_id", conn.id);
    await (a as any)
      .from("integration_connections")
      .update({ status: "disconnected", last_error: null })
      .eq("id", conn.id);
  }

  async function triggerSync() {
    "use server";
    if (!user?.tenant_id) throw new Error("Tenant context required");
    if (!platformEnabled) throw new Error("Provider disabled");

    const store = new ConnectionStore(createSupabaseAdminClient());
    const conn = await store.getTenantConnectionByProviderId({
      tenantId: user.tenant_id,
      providerId: provider.id,
    });
    if (!conn || conn.status !== "connected") throw new Error("Not connected");

    const secrets = await store.getConnectionSecrets({ connectionId: conn.id });
    if (!secrets) throw new Error("Missing secrets");

    await syncContacts({ secrets: secrets as any });

    const a = createAdminClient();
    await (a as any)
      .from("integration_connections")
      .update({ last_sync_at: new Date().toISOString(), last_error: null, status: "connected" })
      .eq("id", conn.id);
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="GoHighLevel" />

      {!platformEnabled && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          This integration is disabled by the platform owner.
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              GoHighLevel
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Connect GoHighLevel to sync contacts and manage acquisition workflows.
            </p>
          </div>
          <div className="flex gap-2">
            {platformEnabled && user?.tenant_id ? (
              connection?.status === "connected" ? (
                <>
                  <form action={triggerSync}>
                    <Button type="submit" variant="outline">
                      Sync
                    </Button>
                  </form>
                  <form action={disconnect}>
                    <Button type="submit" variant="outline">
                      Disconnect
                    </Button>
                  </form>
                </>
              ) : (
                <Link
                  href={`/api/integrations/gohighlevel/auth/start?returnTo=/saas/integrations/crm/gohighlevel`}
                >
                  <Button>Connect</Button>
                </Link>
              )
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Status
            </div>
            <div className="mt-1 text-sm text-gray-900 dark:text-white">
              {connection?.status ?? (user?.tenant_id ? "disconnected" : "n/a")}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Last Sync
            </div>
            <div className="mt-1 text-sm text-gray-900 dark:text-white">
              {connection?.last_sync_at ?? "—"}
            </div>
          </div>
        </div>

        {connection?.last_error && (
          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/40 dark:bg-yellow-950/30 dark:text-yellow-200">
            {connection.last_error}
          </div>
        )}

        {!user?.tenant_id && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
            This page is tenant-scoped. Platform Admin users (no tenant) should manage
            enablement in System Admin.
          </div>
        )}
      </div>
    </div>
  );
}

