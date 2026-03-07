"use server";

import { createAdminClient } from "@/core/database/admin-client";
import { requirePermission } from "@/core/permissions/middleware";
import { isPlatformAdmin } from "./organization-admins";

export interface TenantOption {
  id: string;
  name: string;
  domain: string;
  status: string;
}

export interface TelegramIdentityRow {
  id: string;
  tenant_id: string;
  user_id: string | null;
  telegram_chat_id: string;
  telegram_user_id: string | null;
  is_active: boolean;
  created_at: string;
  tenants?: { name: string; domain: string } | null;
}

export interface TenantMcpServerRow {
  id: string;
  tenant_id: string;
  server_name: string;
  server_url: string;
  enabled: boolean;
  created_at: string;
  tenants?: { name: string; domain: string } | null;
}

async function enforceSystemAdminAccess(): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards.ts:35',message:'enforceSystemAdminAccess called',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  await requirePermission("users.read");
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards.ts:37',message:'requirePermission passed',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const admin = await isPlatformAdmin();
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards.ts:38',message:'isPlatformAdmin result',data:{isAdmin:admin},timestamp:Date.now(),runId:'debug-1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (!admin) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards.ts:39',message:'Not platform admin',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    throw new Error(
      "Only Platform Admins can manage Magic Wizards channel mappings. " +
      "Please log out and sign in as systemadmin@tin.info (password: 88888888) to access this page."
    );
  }
}

export async function getTenantOptions(): Promise<TenantOption[]> {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards.ts:43',message:'getTenantOptions called',data:{},timestamp:Date.now(),runId:'debug-1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  await enforceSystemAdminAccess();
  const client = createAdminClient();
  const { data, error } = await (client.from("tenants") as any)
    .select("id,name,domain,status")
    .order("name", { ascending: true });
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards.ts:47',message:'tenants query result',data:{hasData:!!data,dataCount:data?.length,error:error?.message},timestamp:Date.now(),runId:'debug-1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  if (error) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/612994c7-6727-4770-9f27-7d8df0a11c7b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'magic-wizards.ts:50',message:'tenants query error',data:{errorMessage:error.message},timestamp:Date.now(),runId:'debug-1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    throw new Error(error.message || "Failed to fetch tenants");
  }
  return (data ?? []) as TenantOption[];
}

export async function listTelegramIdentities(): Promise<TelegramIdentityRow[]> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();

  const { data, error } = await (client.from("tenant_telegram_identities") as any)
    .select("id,tenant_id,user_id,telegram_chat_id,telegram_user_id,is_active,created_at,tenants:tenant_id(name,domain)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message || "Failed to fetch Telegram identities");
  }
  return (data ?? []) as TelegramIdentityRow[];
}

export async function createTelegramIdentity(input: {
  tenantId: string;
  telegramChatId: string;
  telegramUserId?: string;
  userId?: string;
}): Promise<void> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();

  if (!input.tenantId || !input.telegramChatId.trim()) {
    throw new Error("Tenant and Telegram chat id are required");
  }

  const payload = {
    tenant_id: input.tenantId,
    telegram_chat_id: input.telegramChatId.trim(),
    telegram_user_id: input.telegramUserId?.trim() || null,
    user_id: input.userId?.trim() || null,
    is_active: true,
  };

  const { error } = await (client.from("tenant_telegram_identities") as any).insert(payload);
  if (error) {
    throw new Error(error.message || "Failed to create Telegram identity");
  }
}

export async function toggleTelegramIdentity(id: string, isActive: boolean): Promise<void> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();
  const { error } = await (client.from("tenant_telegram_identities") as any)
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) {
    throw new Error(error.message || "Failed to update Telegram identity");
  }
}

export async function deleteTelegramIdentity(id: string): Promise<void> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();
  const { error } = await (client.from("tenant_telegram_identities") as any)
    .delete()
    .eq("id", id);
  if (error) {
    throw new Error(error.message || "Failed to delete Telegram identity");
  }
}

export async function listTenantMcpServers(): Promise<TenantMcpServerRow[]> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();

  const { data, error } = await (client.from("tenant_mcp_servers") as any)
    .select("id,tenant_id,server_name,server_url,enabled,created_at,tenants:tenant_id(name,domain)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message || "Failed to fetch tenant MCP servers");
  }
  return (data ?? []) as TenantMcpServerRow[];
}

export async function createTenantMcpServer(input: {
  tenantId: string;
  serverName: string;
  serverUrl: string;
}): Promise<void> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();

  if (!input.tenantId || !input.serverName.trim() || !input.serverUrl.trim()) {
    throw new Error("Tenant, server name, and server URL are required");
  }

  const { error } = await (client.from("tenant_mcp_servers") as any).insert({
    tenant_id: input.tenantId,
    server_name: input.serverName.trim(),
    server_url: input.serverUrl.trim(),
    enabled: true,
  });
  if (error) {
    throw new Error(error.message || "Failed to create MCP server");
  }
}

export async function toggleTenantMcpServer(id: string, enabled: boolean): Promise<void> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();
  const { error } = await (client.from("tenant_mcp_servers") as any)
    .update({ enabled })
    .eq("id", id);
  if (error) {
    throw new Error(error.message || "Failed to update MCP server");
  }
}

export async function deleteTenantMcpServer(id: string): Promise<void> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();
  const { error } = await (client.from("tenant_mcp_servers") as any)
    .delete()
    .eq("id", id);
  if (error) {
    throw new Error(error.message || "Failed to delete MCP server");
  }
}
