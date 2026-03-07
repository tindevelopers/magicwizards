"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import {
  CheckIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import React, { useMemo, useState } from "react";

export type IntegrationListItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  slug: string;
  status: "connected" | "disconnected" | "pending" | "disabled";
  lastSync?: string | null;
  platformEnabled: boolean;
};

const statusIcons = {
  connected: CheckIcon,
  disconnected: XMarkIcon,
  pending: ClockIcon,
  disabled: XMarkIcon,
} as const;

const statusColors = {
  connected:
    "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-500",
  disconnected:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-500",
  disabled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
} as const;

export default function IntegrationsListClient({
  integrations,
}: {
  integrations: IntegrationListItem[];
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "connected" | "disconnected" | "pending" | "disabled"
  >("all");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(integrations.map((i) => i.category))).sort();
    return ["All", ...cats];
  }, [integrations]);

  const filtered = useMemo(() => {
    return integrations.filter((integration) => {
      const matchesSearch =
        integration.name.toLowerCase().includes(search.toLowerCase()) ||
        integration.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || integration.category === selectedCategory;
      const matchesStatus =
        statusFilter === "all" || integration.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [integrations, search, selectedCategory, statusFilter]);

  const groupedByCategory = useMemo(() => {
    return categories.slice(1).map((category) => ({
      category,
      integrations: filtered.filter((i) => i.category === category),
    }));
  }, [categories, filtered]);

  return (
    <div>
      <PageBreadcrumb pageTitle="Integrations" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
              Integrations
            </h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Connect and manage third-party integrations
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations..."
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white/90"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "connected", "disconnected", "pending", "disabled"] as const).map(
              (status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-4 dark:border-gray-800">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Integrations by Category */}
        {selectedCategory === "All" ? (
          <div className="space-y-8">
            {groupedByCategory.map(({ category, integrations: catIntegrations }) => (
              <div key={category}>
                <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                  {category}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catIntegrations.map((integration) => {
                    const Icon = statusIcons[integration.status];
                    return (
                      <Link
                        key={integration.id}
                        href={`/saas/integrations/${integration.category
                          .toLowerCase()
                          .replace(/\s+/g, "-")}/${integration.slug}`}
                        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div className="mb-4 flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {integration.name}
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {integration.description}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              statusColors[integration.status]
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {integration.status}
                          </span>
                        </div>
                        {integration.lastSync && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Last sync: {integration.lastSync}
                          </p>
                        )}
                        {!integration.platformEnabled && (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                            Disabled by platform owner
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((integration) => {
              const Icon = statusIcons[integration.status];
              return (
                <Link
                  key={integration.id}
                  href={`/saas/integrations/${integration.category
                    .toLowerCase()
                    .replace(/\s+/g, "-")}/${integration.slug}`}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {integration.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {integration.description}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusColors[integration.status]
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {integration.status}
                    </span>
                  </div>
                  {integration.lastSync && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Last sync: {integration.lastSync}
                    </p>
                  )}
                  {!integration.platformEnabled && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      Disabled by platform owner
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

