"use server";

import { createClient } from "@/core/database/server";
import { createAdminClient } from "@/core/database/admin-client";
import { requirePermission } from "@/core/permissions/middleware";
import {
  WIZARD_CATALOG,
  type WizardCatalogItem,
} from "@/lib/magic-wizards-options";

export interface TenantOption {
  id: string;
  name: string;
  domain: string;
  status: string;
  wizard_provider?: string | null;
  wizard_model?: string | null;
  default_wizard_id?: string | null;
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

export interface PlatformWizardDefaults {
  default_provider: string | null;
  default_model: string | null;
  default_wizard_id: string | null;
}

export interface WizardPromptSetting {
  wizardId: string;
  wizardName: string;
  corePrompt: string;
  additionalInstructions: string;
}

type CurrentUserContext = {
  userId: string;
  tenantId: string | null;
  roleName: string | null;
  isPlatformAdmin: boolean;
};

async function getCurrentUserContext(): Promise<CurrentUserContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("You must be logged in to manage Magic Wizards.");
  }

  const adminClient = createAdminClient();
  const { data, error } = await (adminClient.from("users") as any)
    .select("tenant_id, roles:role_id(name)")
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error("Unable to load user permissions.");
  }

  const roleName = (data.roles as { name?: string } | null)?.name ?? null;
  const tenantId = (data.tenant_id as string | null) ?? null;
  const isPlatformAdmin = roleName === "Platform Admin" && tenantId === null;

  return {
    userId: user.id,
    tenantId,
    roleName,
    isPlatformAdmin,
  };
}

async function enforceSystemAdminAccess(): Promise<void> {
  await requirePermission("users.read");
  const user = await getCurrentUserContext();
  if (!user.isPlatformAdmin) {
    throw new Error("Only Platform Admins can manage global Magic Wizards settings.");
  }
}

async function enforceTenantOwnerAccess(tenantId: string): Promise<void> {
  await requirePermission("tenants.read");
  const user = await getCurrentUserContext();

  if (user.isPlatformAdmin) {
    return;
  }
  if (!user.tenantId || user.tenantId !== tenantId) {
    throw new Error("You can only manage wizard prompts for your own tenant.");
  }

  const isTenantOwner =
    user.roleName === "Organization Admin" || user.roleName === "Workspace Admin";
  if (!isTenantOwner) {
    throw new Error("Only tenant owners can update tenant wizard instructions.");
  }
}

function validateWizardId(wizardId: string): WizardCatalogItem {
  const wizard = WIZARD_CATALOG.find((item) => item.id === wizardId);
  if (!wizard) {
    throw new Error(`Unknown wizard id: ${wizardId}`);
  }
  return wizard;
}

async function getCorePromptMap(): Promise<Map<string, string>> {
  const client = createAdminClient();
  const { data } = await (client.from("wizard_templates") as any)
    .select("wizard_id,system_prompt")
    .in(
      "wizard_id",
      WIZARD_CATALOG.map((wizard) => wizard.id),
    );

  const dbPrompts = new Map<string, string>();
  for (const row of data ?? []) {
    if (
      typeof row.wizard_id === "string" &&
      typeof row.system_prompt === "string" &&
      row.system_prompt.trim()
    ) {
      dbPrompts.set(row.wizard_id, row.system_prompt);
    }
  }

  const merged = new Map<string, string>();
  for (const wizard of WIZARD_CATALOG) {
    merged.set(wizard.id, dbPrompts.get(wizard.id) ?? wizard.defaultPrompt);
  }
  return merged;
}

async function getTenantPromptRows(tenantId: string): Promise<Map<string, string>> {
  const client = createAdminClient();
  const { data } = await (client.from("tenant_wizard_prompts") as any)
    .select("wizard_id,additional_instructions")
    .eq("tenant_id", tenantId);

  const promptMap = new Map<string, string>();
  for (const row of data ?? []) {
    if (
      typeof row.wizard_id === "string" &&
      typeof row.additional_instructions === "string"
    ) {
      promptMap.set(row.wizard_id, row.additional_instructions);
    }
  }
  return promptMap;
}

export async function getWizardCatalog(): Promise<Array<{ id: string; name: string }>> {
  await requirePermission("tenants.read");
  return WIZARD_CATALOG.map((wizard) => ({ id: wizard.id, name: wizard.name }));
}

export async function getTenantOptions(): Promise<TenantOption[]> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();
  const { data, error } = await (client.from("tenants") as any)
    .select(
      "id,name,domain,status,wizard_provider,wizard_model,default_wizard_id",
    )
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to fetch tenants");
  }
  return (data ?? []) as TenantOption[];
}

export async function getPlatformWizardDefaults(): Promise<PlatformWizardDefaults> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();
  const { data, error } = await (client.from("magic_wizards_platform_config") as any)
    .select("default_provider,default_model,default_wizard_id")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load platform wizard defaults");
  }

  return {
    default_provider: data?.default_provider ?? null,
    default_model: data?.default_model ?? null,
    default_wizard_id: data?.default_wizard_id ?? null,
  };
}

export async function updatePlatformWizardDefaults(input: {
  default_provider?: string | null;
  default_model?: string | null;
  default_wizard_id?: string | null;
}): Promise<void> {
  await enforceSystemAdminAccess();
  if (input.default_model && !input.default_provider) {
    throw new Error("Select a default provider when setting a default model.");
  }
  const client = createAdminClient();
  const { error } = await (client.from("magic_wizards_platform_config") as any)
    .upsert(
      {
        id: true,
        default_provider: input.default_provider || null,
        default_model: input.default_model || null,
        default_wizard_id: input.default_wizard_id || null,
      },
      { onConflict: "id" },
    );

  if (error) {
    throw new Error(error.message || "Failed to save platform wizard defaults");
  }
}

export async function updateTenantWizardDefaults(
  tenantId: string,
  input: {
    wizard_provider?: string | null;
    wizard_model?: string | null;
    default_wizard_id?: string | null;
  },
): Promise<void> {
  await enforceSystemAdminAccess();
  if (input.wizard_model && !input.wizard_provider) {
    throw new Error("Select a provider when setting a tenant wizard model.");
  }
  const client = createAdminClient();
  const { error } = await (client.from("tenants") as any)
    .update({
      wizard_provider: input.wizard_provider || null,
      wizard_model: input.wizard_model || null,
      default_wizard_id: input.default_wizard_id || null,
    })
    .eq("id", tenantId);
  if (error) {
    throw new Error(error.message ?? "Failed to update tenant wizard defaults");
  }
}

export async function listWizardPromptTemplates(): Promise<
  Array<{ wizardId: string; wizardName: string; systemPrompt: string }>
> {
  await enforceSystemAdminAccess();
  const corePrompts = await getCorePromptMap();
  return WIZARD_CATALOG.map((wizard) => ({
    wizardId: wizard.id,
    wizardName: wizard.name,
    systemPrompt: corePrompts.get(wizard.id) ?? wizard.defaultPrompt,
  }));
}

export async function updateWizardPromptTemplate(
  wizardId: string,
  systemPrompt: string,
): Promise<void> {
  await enforceSystemAdminAccess();
  validateWizardId(wizardId);

  const trimmed = systemPrompt.trim();
  if (!trimmed) {
    throw new Error("Core prompt cannot be empty.");
  }

  const client = createAdminClient();
  const { error } = await (client.from("wizard_templates") as any).upsert(
    {
      wizard_id: wizardId,
      system_prompt: trimmed,
    },
    { onConflict: "wizard_id" },
  );

  if (error) {
    throw new Error(error.message || "Failed to save wizard template");
  }
}

export async function getTenantWizardPromptSettings(
  tenantId: string,
): Promise<WizardPromptSetting[]> {
  await enforceSystemAdminAccess();
  const [corePrompts, additions] = await Promise.all([
    getCorePromptMap(),
    getTenantPromptRows(tenantId),
  ]);

  return WIZARD_CATALOG.map((wizard) => ({
    wizardId: wizard.id,
    wizardName: wizard.name,
    corePrompt: corePrompts.get(wizard.id) ?? wizard.defaultPrompt,
    additionalInstructions: additions.get(wizard.id) ?? "",
  }));
}

export async function updateTenantWizardPrompt(
  tenantId: string,
  wizardId: string,
  additionalInstructions: string,
): Promise<void> {
  await enforceSystemAdminAccess();
  validateWizardId(wizardId);
  const client = createAdminClient();
  const trimmed = additionalInstructions.trim();

  if (!trimmed) {
    const { error } = await (client.from("tenant_wizard_prompts") as any)
      .delete()
      .eq("tenant_id", tenantId)
      .eq("wizard_id", wizardId);
    if (error) {
      throw new Error(error.message || "Failed to clear tenant wizard instructions");
    }
    return;
  }

  const { error } = await (client.from("tenant_wizard_prompts") as any).upsert(
    {
      tenant_id: tenantId,
      wizard_id: wizardId,
      additional_instructions: trimmed,
    },
    { onConflict: "tenant_id,wizard_id" },
  );
  if (error) {
    throw new Error(error.message || "Failed to save tenant wizard instructions");
  }
}

export async function getCurrentTenantWizardPromptSettings(): Promise<WizardPromptSetting[]> {
  await requirePermission("tenants.read");
  const context = await getCurrentUserContext();
  if (!context.tenantId) {
    throw new Error("No tenant context found for current user.");
  }
  await enforceTenantOwnerAccess(context.tenantId);
  const [corePrompts, additions] = await Promise.all([
    getCorePromptMap(),
    getTenantPromptRows(context.tenantId),
  ]);

  return WIZARD_CATALOG.map((wizard) => ({
    wizardId: wizard.id,
    wizardName: wizard.name,
    corePrompt: corePrompts.get(wizard.id) ?? wizard.defaultPrompt,
    additionalInstructions: additions.get(wizard.id) ?? "",
  }));
}

export async function updateCurrentTenantWizardPrompt(
  wizardId: string,
  additionalInstructions: string,
): Promise<void> {
  await requirePermission("tenants.read");
  const context = await getCurrentUserContext();
  if (!context.tenantId) {
    throw new Error("No tenant context found for current user.");
  }
  await enforceTenantOwnerAccess(context.tenantId);
  validateWizardId(wizardId);
  const client = createAdminClient();
  const trimmed = additionalInstructions.trim();

  if (!trimmed) {
    const { error } = await (client.from("tenant_wizard_prompts") as any)
      .delete()
      .eq("tenant_id", context.tenantId)
      .eq("wizard_id", wizardId);
    if (error) {
      throw new Error(error.message || "Failed to clear tenant wizard instructions");
    }
    return;
  }

  const { error } = await (client.from("tenant_wizard_prompts") as any).upsert(
    {
      tenant_id: context.tenantId,
      wizard_id: wizardId,
      additional_instructions: trimmed,
    },
    { onConflict: "tenant_id,wizard_id" },
  );
  if (error) {
    throw new Error(error.message || "Failed to save tenant wizard instructions");
  }
}

export async function listTelegramIdentities(): Promise<TelegramIdentityRow[]> {
  await enforceSystemAdminAccess();
  const client = createAdminClient();

  const { data, error } = await (client.from("tenant_telegram_identities") as any)
    .select(
      "id,tenant_id,user_id,telegram_chat_id,telegram_user_id,is_active,created_at,tenants:tenant_id(name,domain)",
    )
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

  const { error } = await (client.from("tenant_telegram_identities") as any).insert(
    payload,
  );
  if (error) {
    throw new Error(error.message || "Failed to create Telegram identity");
  }
}

export async function toggleTelegramIdentity(
  id: string,
  isActive: boolean,
): Promise<void> {
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

export async function toggleTenantMcpServer(
  id: string,
  enabled: boolean,
): Promise<void> {
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
