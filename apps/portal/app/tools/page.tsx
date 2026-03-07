import type { Metadata } from "next";
import ConsumerLayout from "@/layout/ConsumerLayout";
import { createAdminClient } from "@/core/database/admin-client";
import { getCurrentUser } from "@/core/database/user-actions";
import MyToolsClient from "./MyToolsClient";

export const metadata: Metadata = {
  title: "My Tools - Magic Wizards",
  description: "Manage your connected tools and integrations",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyToolsPage() {
  const user = await getCurrentUser();
  const admin = createAdminClient();

  const { data: providers } = await (admin as any)
    .from("integration_providers")
    .select("id, slug, name, category, auth_type, description")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const { data: platformSettings } = await (admin as any)
    .from("platform_integration_settings")
    .select("provider_id, enabled");

  const enabledByProviderId = new Map<string, boolean>();
  for (const s of (platformSettings as any[]) ?? [])
    enabledByProviderId.set(s.provider_id, !!s.enabled);

  const tenantId = user?.tenant_id ?? null;
  const userId = user?.id ?? null;

  const { data: connections } = tenantId
    ? await (admin as any)
        .from("integration_connections")
        .select("id, provider_id, status, scope, user_id")
        .eq("tenant_id", tenantId)
    : { data: [] as any[] };

  const tools = (providers ?? []).map((p: any) => {
    const platformEnabled = enabledByProviderId.get(p.id) ?? false;
    const isUserAuth = p.auth_type === "oauth2";
    const conn = (connections as any[]).find(
      (c) =>
        c.provider_id === p.id &&
        (isUserAuth ? c.user_id === userId : c.scope === "tenant")
    );
    const status = !platformEnabled
      ? "disabled"
      : conn?.status === "connected"
        ? "active"
        : isUserAuth
          ? "connect"
          : "pending_config";

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description ?? "",
      authType: p.auth_type,
      status,
      platformEnabled,
    };
  });

  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL?.replace(/\/$/, "") || "http://localhost:3001";
  const portalUrl =
    process.env.NEXT_PUBLIC_PORTAL_URL?.replace(/\/$/, "") ||
    "http://localhost:3002";

  return (
    <ConsumerLayout>
      <MyToolsClient tools={tools} adminUrl={adminUrl} portalUrl={portalUrl} />
    </ConsumerLayout>
  );
}
