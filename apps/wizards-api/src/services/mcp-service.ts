import { getSupabaseAdminClient } from "../supabase.js";

export interface TenantMcpConfig {
  type: "url";
  name: string;
  url: string;
}

interface McpRow {
  server_name: string;
  server_url: string;
}

export async function getMcpServersForTenant(
  tenantId: string,
): Promise<TenantMcpConfig[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("tenant_mcp_servers")
    .select("server_name,server_url")
    .eq("tenant_id", tenantId)
    .eq("enabled", true);

  if (error || !data) {
    return [];
  }

  return (data as McpRow[]).map((row) => ({
    type: "url",
    name: row.server_name,
    url: row.server_url,
  }));
}
