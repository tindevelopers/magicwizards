import type { WizardProvider } from "@magicwizards/wizards-core";
import { logger } from "../logger.js";
import { getSupabaseAdminClient } from "../supabase.js";

const PLATFORM_CACHE_TTL_MS = 30_000;

type PlatformDefaultsCache = {
  defaultProvider: WizardProvider | null;
  defaultModel: string | null;
  defaultWizardId: string | null;
};

let defaultsCache: { value: PlatformDefaultsCache; expiresAt: number } | null = null;
let corePromptCache:
  | {
      value: Map<string, string>;
      expiresAt: number;
    }
  | null = null;

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function getPlatformRuntimeDefaults(): Promise<PlatformDefaultsCache> {
  const now = Date.now();
  if (defaultsCache && defaultsCache.expiresAt > now) {
    return defaultsCache.value;
  }

  const client = getSupabaseAdminClient();
  const { data, error } = await (client.from("magic_wizards_platform_config") as any)
    .select("default_provider,default_model,default_wizard_id")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    logger.error("platform_defaults_fetch_failed", { error: error.message });
  }

  const value: PlatformDefaultsCache = {
    defaultProvider: normalizeText(data?.default_provider) as WizardProvider | null,
    defaultModel: normalizeText(data?.default_model),
    defaultWizardId: normalizeText(data?.default_wizard_id),
  };

  defaultsCache = {
    value,
    expiresAt: now + PLATFORM_CACHE_TTL_MS,
  };

  return value;
}

async function getCorePromptMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (corePromptCache && corePromptCache.expiresAt > now) {
    return corePromptCache.value;
  }

  const client = getSupabaseAdminClient();
  const { data, error } = await (client.from("wizard_templates") as any)
    .select("wizard_id,system_prompt");

  if (error) {
    logger.error("wizard_templates_fetch_failed", { error: error.message });
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const wizardId = normalizeText(row.wizard_id);
    const systemPrompt = normalizeText(row.system_prompt);
    if (wizardId && systemPrompt) {
      map.set(wizardId, systemPrompt);
    }
  }

  corePromptCache = {
    value: map,
    expiresAt: now + PLATFORM_CACHE_TTL_MS,
  };
  return map;
}

async function getTenantPromptAddition(
  tenantId: string,
  wizardId: string,
): Promise<string | null> {
  const client = getSupabaseAdminClient();
  const { data, error } = await (client.from("tenant_wizard_prompts") as any)
    .select("additional_instructions")
    .eq("tenant_id", tenantId)
    .eq("wizard_id", wizardId)
    .maybeSingle();

  if (error) {
    logger.error("tenant_wizard_prompt_fetch_failed", {
      error: error.message,
      tenantId,
      wizardId,
    });
    return null;
  }

  return normalizeText(data?.additional_instructions);
}

export async function getEffectiveWizardPrompt(input: {
  tenantId: string;
  wizardId: string;
  fallbackPrompt: string;
}): Promise<string> {
  const [coreMap, tenantAddition] = await Promise.all([
    getCorePromptMap(),
    getTenantPromptAddition(input.tenantId, input.wizardId),
  ]);

  const platformCore = coreMap.get(input.wizardId) ?? input.fallbackPrompt;
  if (!tenantAddition) {
    return platformCore;
  }
  return `${platformCore}\n\nTenant-specific additional instructions:\n${tenantAddition}`;
}
