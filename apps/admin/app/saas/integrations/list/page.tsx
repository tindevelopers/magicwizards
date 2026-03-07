export const dynamic = "force-dynamic";
export const revalidate = 0;

import IntegrationsListClient, {
  type IntegrationListItem,
} from "@/components/integrations/IntegrationsListClient";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentUser } from "@/core/database/user-actions";

export default async function IntegrationsListPage() {
  const user = await getCurrentUser();
  const admin = createAdminClient();

  const { data: providers } = await (admin as any)
    .from("integration_providers")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const providerList = providers ?? [];

  // Platform settings (enabled/disabled)
  const { data: platformSettings } = await (admin as any)
    .from("platform_integration_settings")
    .select("*");

  const enabledByProviderId = new Map<string, boolean>();
  for (const s of (platformSettings as any[]) ?? [])
    enabledByProviderId.set(s.provider_id, !!s.enabled);

  const tenantId = user?.tenant_id ?? null;
  const { data: connections } = tenantId
    ? await (admin as any)
        .from("integration_connections")
        .select("*")
        .eq("tenant_id", tenantId)
    : { data: [] as any[] };

  const connByProviderId = new Map<string, any>();
  for (const c of connections ?? []) connByProviderId.set(c.provider_id, c);

  const items: IntegrationListItem[] = providerList.map((p: any) => {
    const platformEnabled = enabledByProviderId.get(p.id) ?? false;
    const c = connByProviderId.get(p.id);
    const status = !platformEnabled
      ? "disabled"
      : (c?.status ?? "disconnected");
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description ?? "",
      slug: p.slug,
      status,
      lastSync: c?.last_sync_at ?? null,
      platformEnabled,
    };
  });

  return <IntegrationsListClient integrations={items} />;
}
