export const dynamic = "force-dynamic";
export const revalidate = 0;

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentUser } from "@/core/database/user-actions";
import ApiConnectionsClient from "./ApiConnectionsClient";

export default async function APIConnectionsPage() {
  const user = await getCurrentUser();
  const admin = createAdminClient();

  const tenantId = user?.tenant_id ?? null;

  const { data: providers } = await (admin as any)
    .from("integration_providers")
    .select("*")
    .eq("auth_type", "api_key")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const providerList = providers ?? [];

  const providerIds = providerList.map((p: any) => p.id);
  const { data: platformSettings } =
    providerIds.length > 0
      ? await (admin as any)
          .from("platform_integration_settings")
          .select("provider_id, enabled")
          .in("provider_id", providerIds)
      : { data: [] as any[] };

  const enabledByProviderId = new Map<string, boolean>();
  for (const s of platformSettings ?? []) {
    enabledByProviderId.set(s.provider_id, !!s.enabled);
  }

  const { data: connections } = tenantId
    ? await (admin as any)
        .from("integration_connections")
        .select("id, provider_id, status")
        .eq("tenant_id", tenantId)
        .eq("scope", "tenant")
    : { data: [] as any[] };

  const connByProviderId = new Map<string, any>();
  for (const c of connections ?? []) connByProviderId.set(c.provider_id, c);

  const items = providerList.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    description: p.description ?? "",
    status: (connByProviderId.get(p.id)?.status ?? "disconnected") as
      | "connected"
      | "disconnected",
    platformEnabled: enabledByProviderId.get(p.id) ?? false,
  }));

  return <ApiConnectionsClient items={items} />;
}
