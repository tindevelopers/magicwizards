"use client";

import {
  CheckCircleIcon,
  LinkIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

type ToolStatus = "active" | "connect" | "pending_config" | "disabled";

type ToolItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  authType: string;
  status: ToolStatus;
  platformEnabled: boolean;
};

export default function MyToolsClient({
  tools,
  adminUrl,
  portalUrl,
}: {
  tools: ToolItem[];
  adminUrl: string;
  portalUrl: string;
}) {
  const returnTo =
    portalUrl || (typeof window !== "undefined" ? window.location.origin : "") || "";
  const fullReturnTo = returnTo ? `${returnTo}/tools` : "/tools";
  const grouped = tools.reduce<Record<string, ToolItem[]>>((acc, t) => {
    const cat = t.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Tools
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Tools and integrations available to your wizards. Connect your
          accounts to enable Gmail, Calendar, HubSpot, and more.
        </p>
      </div>

      {categories.map((category) => (
        <div key={category}>
          <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize">
            {category}
          </h2>
          <div className="space-y-3">
            {grouped[category].map((tool) => (
              <div
                key={tool.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <WrenchScrewdriverIcon className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {tool.name}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {tool.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {tool.status === "active" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/15 dark:text-green-500">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Active
                      </span>
                    )}
                    {tool.status === "connect" && (
                      <a
                        href={`${adminUrl}/api/integrations/${tool.slug}/auth/start?returnTo=${encodeURIComponent(
                          fullReturnTo
                        )}`}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        Connect
                      </a>
                    )}
                    {tool.status === "pending_config" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-500">
                        Configure in Admin
                      </span>
                    )}
                    {tool.status === "disabled" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        <XCircleIcon className="h-3.5 w-3.5" />
                        Unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
