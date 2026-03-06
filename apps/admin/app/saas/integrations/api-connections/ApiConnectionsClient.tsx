"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import {
  PlusIcon,
  KeyIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import {
  saveTenantApiKeyConnection,
  disconnectTenantApiKeyConnection,
} from "@/app/actions/integrations/tenant-api-keys";

export type ApiConnectionItem = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  status: "connected" | "disconnected";
  platformEnabled: boolean;
};

const FIELD_CONFIG: Record<string, { key: string; label: string }[]> = {
  telnyx: [{ key: "api_key", label: "API Key" }],
  vapi: [{ key: "api_key", label: "API Key" }],
  twilio: [
    { key: "account_sid", label: "Account SID" },
    { key: "auth_token", label: "Auth Token" },
  ],
  "web-search": [
    { key: "api_key", label: "API Key (Google CSE or SerpAPI)" },
  ],
};

export default function ApiConnectionsClient({
  items,
}: {
  items: ApiConnectionItem[];
}) {
  const [showForm, setShowForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldsFor = (slug: string) =>
    FIELD_CONFIG[slug] ?? [{ key: "api_key", label: "API Key" }];

  const handleConnect = async (slug: string) => {
    setLoading(true);
    setError(null);
    const fields = fieldsFor(slug);
    const secrets: Record<string, string> = {};
    for (const f of fields) {
      const v = formData[`${slug}_${f.key}`]?.trim();
      if (v) secrets[f.key] = v;
    }
    if (Object.keys(secrets).length === 0) {
      setError("Please enter at least one credential");
      setLoading(false);
      return;
    }
    // Twilio adapter expects api_key as "accountSid:authToken"
    if (slug === "twilio" && secrets.account_sid && secrets.auth_token) {
      secrets.api_key = `${secrets.account_sid}:${secrets.auth_token}`;
    }
    const result = await saveTenantApiKeyConnection(slug, secrets);
    if (result.ok) {
      setShowForm(null);
      setFormData({});
      window.location.reload();
    } else {
      setError(result.error ?? "Failed to save");
    }
    setLoading(false);
  };

  const handleDisconnect = async (slug: string) => {
    setLoading(true);
    setError(null);
    const result = await disconnectTenantApiKeyConnection(slug);
    if (result.ok) {
      window.location.reload();
    } else {
      setError(result.error ?? "Failed to disconnect");
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              API Connections
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Configure org-level API keys for telephony, web search, and other
              tools. These are used by Magic Wizards when users run wizard
              sessions.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {items.map((connection) => {
            const isConnected = connection.status === "connected";
            const isFormOpen = showForm === connection.slug;
            const fields = fieldsFor(connection.slug);

            return (
              <div
                key={connection.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-500/15">
                      <KeyIcon className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {connection.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {connection.description}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      !connection.platformEnabled
                        ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        : isConnected
                          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-500"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {!connection.platformEnabled
                      ? "Disabled"
                      : isConnected
                        ? "Connected"
                        : "Not configured"}
                  </span>
                </div>

                {!connection.platformEnabled ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Contact platform admin to enable this integration.
                  </p>
                ) : isConnected && !isFormOpen ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForm(connection.slug)}
                    >
                      Update API Key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(connection.slug)}
                      disabled={loading}
                    >
                      <TrashIcon className="h-4 w-4" />
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((f) => (
                      <div key={f.key}>
                        <Label htmlFor={`${connection.slug}_${f.key}`}>
                          {f.label}
                        </Label>
                        <Input
                          id={`${connection.slug}_${f.key}`}
                          type="password"
                          placeholder={`Enter ${f.label.toLowerCase()}`}
                          value={
                            formData[`${connection.slug}_${f.key}`] ?? ""
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [`${connection.slug}_${f.key}`]: e.target.value,
                            })
                          }
                          className="mt-2"
                        />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConnect(connection.slug)}
                        disabled={loading}
                      >
                        <CheckIcon className="h-4 w-4" />
                        {isConnected ? "Update" : "Connect"}
                      </Button>
                      {isFormOpen && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowForm(null);
                            setFormData({});
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-900/40">
            <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No API key integrations are available. Platform admin can add
              providers (Telnyx, Vapi, Twilio, Web Search) in System Admin →
              Integrations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
