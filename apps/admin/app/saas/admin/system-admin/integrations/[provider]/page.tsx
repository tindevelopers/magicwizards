import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { createClient } from "@/core/database/server";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SystemAdminProviderSettingsPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider: providerSlug } = await params;
  const supabase = await createClient();

  const { data: provider, error: providerError } = await (supabase as any)
    .from("integration_providers")
    .select("*")
    .eq("slug", providerSlug)
    .maybeSingle();

  if (providerError) throw providerError;
  if (!provider) notFound();

  const { data: settingsRow } = await (supabase as any)
    .from("platform_integration_settings")
    .select("*")
    .eq("provider_id", provider.id)
    .maybeSingle();

  const enabled = settingsRow?.enabled === true;
  const settings = (settingsRow?.settings ?? {}) as any;

  async function save(formData: FormData) {
    "use server";
    const s = await createClient();

    const enabledNext = formData.get("enabled") === "on";
    const oauthClientId = String(formData.get("oauthClientId") ?? "").trim();
    const oauthClientSecret = String(formData.get("oauthClientSecret") ?? "").trim();
    const oauthRedirectUri = String(formData.get("oauthRedirectUri") ?? "").trim();
    const oauthScopes = String(formData.get("oauthScopes") ?? "").trim();

    const nextSettings: Record<string, any> = {
      oauthClientId,
      oauthClientSecret,
      oauthRedirectUri,
      oauthScopes,
    };

    await (s as any)
      .from("platform_integration_settings")
      .upsert(
        {
          provider_id: provider.id,
          enabled: enabledNext,
          settings: nextSettings,
        } as any,
        { onConflict: "provider_id" }
      );

    redirect("/saas/admin/system-admin/integrations");
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={`${provider.name} (System Admin)`} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {provider.name} Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Platform-level configuration. Tenants can only connect if this provider is enabled.
          </p>
        </div>

        <form action={save} className="space-y-6">
          <div className="flex items-center gap-3">
            <input
              id="enabled"
              name="enabled"
              type="checkbox"
              defaultChecked={enabled}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <Label htmlFor="enabled">Enabled for platform</Label>
          </div>

          {provider.slug === "gohighlevel" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="oauthClientId">OAuth Client ID</Label>
                  <Input
                    id="oauthClientId"
                    name="oauthClientId"
                    defaultValue={String(settings.oauthClientId ?? "")}
                    placeholder="GoHighLevel OAuth Client ID"
                  />
                </div>
                <div>
                  <Label htmlFor="oauthClientSecret">OAuth Client Secret</Label>
                  <Input
                    id="oauthClientSecret"
                    name="oauthClientSecret"
                    type="password"
                    defaultValue={String(settings.oauthClientSecret ?? "")}
                    placeholder="GoHighLevel OAuth Client Secret"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="oauthRedirectUri">OAuth Redirect URI (optional)</Label>
                  <Input
                    id="oauthRedirectUri"
                    name="oauthRedirectUri"
                    defaultValue={String(settings.oauthRedirectUri ?? "")}
                    placeholder="https://yourdomain.com/api/integrations/gohighlevel/auth/callback"
                  />
                </div>
                <div>
                  <Label htmlFor="oauthScopes">OAuth Scopes</Label>
                  <Input
                    id="oauthScopes"
                    name="oauthScopes"
                    defaultValue={String(settings.oauthScopes ?? "contacts.read")}
                    placeholder="contacts.read contacts.write"
                  />
                </div>
              </div>
            </>
          ) : provider.slug === "google" || provider.slug === "microsoft" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="oauthClientId">OAuth Client ID</Label>
                  <Input
                    id="oauthClientId"
                    name="oauthClientId"
                    defaultValue={String(settings.oauthClientId ?? "")}
                    placeholder={
                      provider.slug === "microsoft"
                        ? "Azure App Registration Application (client) ID"
                        : "Google OAuth Client ID"
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="oauthClientSecret">OAuth Client Secret</Label>
                  <Input
                    id="oauthClientSecret"
                    name="oauthClientSecret"
                    type="password"
                    defaultValue={String(settings.oauthClientSecret ?? "")}
                    placeholder={
                      provider.slug === "microsoft"
                        ? "Azure App Registration Client Secret"
                        : "Google OAuth Client Secret"
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="oauthRedirectUri">OAuth Redirect URI (optional)</Label>
                <Input
                  id="oauthRedirectUri"
                  name="oauthRedirectUri"
                  defaultValue={String(settings.oauthRedirectUri ?? "")}
                  placeholder={
                    provider.slug === "microsoft"
                      ? "https://yourdomain.com/api/integrations/microsoft/auth/callback"
                      : "https://yourdomain.com/api/integrations/google/auth/callback"
                  }
                />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
              No provider-specific settings UI has been defined yet for this integration.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

