import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/core/database/user-actions";
import { createAdminClient } from "@/core/database/admin-client";
import { getProviderAndPlatformSettings } from "@/app/api/integrations/_utils";
import { ConnectionStore, createSupabaseAdminClient } from "@tinadmin/integrations-core";
import { syncContacts } from "@tinadmin/integration-gohighlevel";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.tenant_id) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 }
    );
  }

  const { provider, platformSettings } = await getProviderAndPlatformSettings("gohighlevel");
  if (!platformSettings?.enabled) {
    return NextResponse.json(
      { error: "GoHighLevel is not enabled by the platform owner." },
      { status: 403 }
    );
  }

  const store = new ConnectionStore(createSupabaseAdminClient());
  const connection = await store.getTenantConnectionByProviderId({
    tenantId: user.tenant_id,
    providerId: provider.id,
  });

  if (!connection || connection.status !== "connected") {
    return NextResponse.json(
      { error: "GoHighLevel is not connected for this tenant." },
      { status: 400 }
    );
  }

  const secrets = await store.getConnectionSecrets({ connectionId: connection.id });
  if (!secrets) {
    return NextResponse.json(
      { error: "Missing connection secrets." },
      { status: 500 }
    );
  }

  const result = await syncContacts({ secrets: secrets as any });

  const admin = createAdminClient();
  await (admin as any)
    .from("integration_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_error: null,
      status: "connected",
    })
    .eq("id", connection.id);

  return NextResponse.json({ ok: true, result });
}

