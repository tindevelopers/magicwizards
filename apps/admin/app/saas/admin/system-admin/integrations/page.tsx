import Link from "next/link";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import { createClient } from "@/core/database/server";
import { getCurrentUser } from "@/core/database/user-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SystemAdminIntegrationsPage() {
  const user = await getCurrentUser();

  async function toggleProvider(formData: FormData) {
    "use server";

    const providerId = String(formData.get("providerId") ?? "");
    const enabled = String(formData.get("enabled") ?? "") === "true";

    const supabase = await createClient();
    await (supabase as any).from("platform_integration_settings").upsert(
      {
        provider_id: providerId,
        enabled,
        settings: {},
        created_by: user?.id ?? null,
      } as any,
      { onConflict: "provider_id" }
    );
  }

  const supabase = await createClient();

  const { data: providers } = await (supabase as any)
    .from("integration_providers")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const { data: settings } = await (supabase as any)
    .from("platform_integration_settings")
    .select("*");

  const enabledByProviderId = new Map<string, any>();
  for (const s of settings ?? []) enabledByProviderId.set((s as any).provider_id, s);

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Integrations (System Admin)" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Platform Integrations
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enable integrations platform-wide and configure provider defaults.
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {(providers ?? []).map((p: any) => {
            const s = enabledByProviderId.get(p.id);
            const enabled = s?.enabled === true;
            return (
              <div key={p.id} className="flex items-center justify-between py-4">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {p.category} • {p.slug}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                    href={`/saas/admin/system-admin/integrations/${p.slug}`}
                  >
                    Configure
                  </Link>
                  <form action={toggleProvider} className="flex items-center gap-2">
                    <input type="hidden" name="providerId" value={p.id} />
                    <input type="hidden" name="enabled" value={String(!enabled)} />
                    <Button type="submit" variant={enabled ? "outline" : "primary"} size="sm">
                      {enabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

