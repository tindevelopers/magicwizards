import type { Metadata } from "next";
import React from "react";
import {
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  FolderIcon,
  GlobeAltIcon,
  HeartIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Multi-Tenant Base Menu | TailAdmin Template",
  description:
    "Foundational multi-tenant navigation system designed to flex across industries, tenants, and operator roles.",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

const tenantProfiles = [
  {
    name: "Atlas Retail Group",
    industry: "Omni-channel Retail",
    status: "Live",
    accent: "text-emerald-500",
    badgeTone:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    metrics: [
      { label: "Sites", value: "48" },
      { label: "Modules", value: "12" },
    ],
    timezone: "EST • NYC anchor",
  },
  {
    name: "Lumen Health Systems",
    industry: "Healthcare Networks",
    status: "HIPAA-ready",
    accent: "text-rose-500",
    badgeTone:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200",
    metrics: [
      { label: "Clinics", value: "22" },
      { label: "Care Paths", value: "8" },
    ],
    timezone: "CST • Chicago hub",
  },
  {
    name: "Northwind Finance",
    industry: "FinTech & Treasury",
    status: "Pilot",
    accent: "text-sky-500",
    badgeTone:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-200",
    metrics: [
      { label: "Regions", value: "6" },
      { label: "Desks", value: "14" },
    ],
    timezone: "GMT • London desk",
  },
];

const industrySpaces: {
  title: string;
  description: string;
  gradient: string;
  icon: IconComponent;
  stack: string[];
  badge: string;
}[] = [
  {
    title: "Commerce & Retail",
    description:
      "Inventory, digital merchandising, experiential retail, and last-mile orchestration.",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    icon: ShoppingBagIcon,
    stack: ["Clienteling", "Inventory Brain", "Store Ops"],
    badge: "Omni-channel kits",
  },
  {
    title: "Healthcare Networks",
    description:
      "Patient flows, credentialing, consent, and connected care pathways.",
    gradient: "from-rose-500 via-pink-500 to-orange-500",
    icon: HeartIcon,
    stack: ["Care Plans", "Clinical Docs", "Outreach"],
    badge: "HIPAA guardrails",
  },
  {
    title: "Financial Services",
    description:
      "Portfolio visibility, treasury automations, risk workflows, and regional alignment.",
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    icon: BanknotesIcon,
    stack: ["Risk Desk", "Deal Rooms", "Client Portal"],
    badge: "SOC 2 ready",
  },
  {
    title: "Education & Public",
    description:
      "Lifecycle comms, funding oversight, credential sharing, and cohort journeys.",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    icon: AcademicCapIcon,
    stack: ["Learner Hub", "Grant Ops", "Community"],
    badge: "Multi-campus",
  },
];

const menuBlueprint = [
  {
    name: "Foundation",
    description: "Always-on anchors that travel with every tenant.",
    items: [
      {
        title: "Universal Overview",
        description: "KPIs, alerts, and tenant-level narratives in one hero view.",
        icon: Squares2X2Icon,
        tags: ["Default", "Exec", "Ops"],
        badge: "Shipping",
      },
      {
        title: "Tenant Directory",
        description: "Search, filters, and territory groupings with instant switch.",
        icon: BuildingOffice2Icon,
        tags: ["Switcher", "Search"],
        badge: "Context-aware",
      },
    ],
  },
  {
    name: "Tenant Ops",
    description: "Purpose-built workspaces that inherit schemas.",
    items: [
      {
        title: "Lifecycle Boards",
        description: "Movement across onboarding, go-live, expansion, retention.",
        icon: AdjustmentsHorizontalIcon,
        tags: ["Playbooks", "Workflows"],
        badge: "Template",
      },
      {
        title: "Compliance Hub",
        description: "Audit packs, attestations, and industry certificates.",
        icon: ShieldCheckIcon,
        tags: ["Regulated", "Tasks"],
        badge: "Token-aware",
      },
    ],
  },
  {
    name: "Intelligence",
    description: "Insights, signals, and guidance tailored per region.",
    items: [
      {
        title: "Command Center",
        description: "Live signals, anomaly clustering, proactive nudges.",
        icon: PresentationChartLineIcon,
        tags: ["AI", "Insights"],
        badge: "Realtime",
      },
      {
        title: "Knowledge Collections",
        description: "Industry-grade playbooks with media, files, and embeds.",
        icon: FolderIcon,
        tags: ["Docs", "Assets"],
        badge: "Composable",
      },
    ],
  },
];

const experienceStates = [
  {
    name: "Global Command Bar",
    scenario: "⌘K palette surfaces tenants, modules, and quick configs.",
    surfaces: "Header, Spotlight, Mobile sheet",
    status: "Ready",
  },
  {
    name: "Adaptive Navigation",
    scenario: "Menu collapses and pins based on role & recent usage.",
    surfaces: "Sidebar, Product header",
    status: "Design complete",
  },
  {
    name: "Blueprint Rollouts",
    scenario: "Stage configurations per industry before promoting live.",
    surfaces: "Blueprint modal, Timeline",
    status: "In build",
  },
];

const quickActions = [
  {
    title: "New Tenant Blueprint",
    description: "Clone framework, apply tokens, invite operators.",
    icon: SparklesIcon,
    accent: "from-indigo-500 to-violet-500",
  },
  {
    title: "Instant Launch Kit",
    description: "Bundle menu, roles, and starter data packs.",
    icon: BoltIcon,
    accent: "from-emerald-500 to-teal-500",
  },
  {
    title: "Share Read-Only Deck",
    description: "Publish a secure preview to stakeholders.",
    icon: CloudArrowUpIcon,
    accent: "from-rose-500 to-orange-500",
  },
];

const previewNav = [
  {
    label: "Operate",
    modules: ["Command Center", "Journeys", "Signals"],
  },
  {
    label: "Collaborate",
    modules: ["Docs", "Huddles", "Briefings"],
  },
  {
    label: "Configure",
    modules: ["Blueprints", "Access", "Branding"],
  },
];

export default function MultiTenantBaseTemplate() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 p-8 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-16 top-10 h-64 w-64 rounded-full bg-violet-500 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500 blur-[120px]" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-sm uppercase tracking-wide text-white/80">
              <GlobeAltIcon className="h-4 w-4" />
              Multi-industry navigation system
            </p>
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
              Multi-Tenant Base Menu
            </h1>
            <p className="max-w-2xl text-lg text-white/70">
              Blueprint a single navigation experience that fluidly adapts to any
              tenant, operator role, region, or industry vertical without
              rebuilding the stack.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/20">
                <SparklesIcon className="h-4 w-4" />
                Launch interactive preview
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white">
                <CheckBadgeIcon className="h-4 w-4" />
                View compliance pack
              </button>
            </div>
          </div>
          <div className="grid w-full max-w-md gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div>
              <p className="text-sm uppercase tracking-wide text-white/60">
                Tenants live
              </p>
              <p className="text-4xl font-semibold">37</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-white/10 p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Industries
                </p>
                <p className="text-2xl font-semibold">9</p>
                <p className="text-xs text-white/60">pre-built kits</p>
              </div>
              <div className="rounded-xl border border-white/10 p-3">
                <p className="text-xs uppercase tracking-wide text-white/50">
                  Modules
                </p>
                <p className="text-2xl font-semibold">42</p>
                <p className="text-xs text-white/60">ready to apply</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 p-3 text-sm text-white/80">
              <p className="mb-1 text-xs uppercase tracking-wide text-white/50">
                Global states
              </p>
              Adaptive, responsive, and themable navigation atoms out of the box.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tenant switcher
              </p>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Unified control plane
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-200">
                <UserGroupIcon className="h-4 w-4" />
                Share blueprint
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-900">
                <SparklesIcon className="h-4 w-4" />
                Add tenant
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {tenantProfiles.map((tenant) => (
              <div
                key={tenant.name}
                className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white/70 p-5 transition hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/70"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {tenant.name}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tenant.badgeTone}`}
                      >
                        {tenant.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {tenant.industry}
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-700 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-200">
                    Switch tenant
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                  <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <GlobeAltIcon className="h-4 w-4" />
                    {tenant.timezone}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {tenant.metrics.map((metric) => (
                      <div key={metric.label}>
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          {metric.label}
                        </p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {metric.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-6 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-gray-950">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Brand system
            </p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Token-aware layers
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Every tenant inherits a palette, typography scale, and motion feel.
            </p>
          </div>
          <div className="space-y-3 rounded-xl border border-dashed border-gray-200 p-4 dark:border-gray-800">
            {["Primary", "Surface", "Accent"].map((token) => (
              <div key={token} className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    {token} token
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {token === "Primary"
                      ? "Dynamic gradient"
                      : token === "Surface"
                        ? "Frosted layers"
                        : "Neon pulse"}
                  </p>
                </div>
                <span className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white/70 p-4 text-sm shadow-inner dark:bg-gray-900/80">
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Micro-interactions
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Curated easing presets for focus, hover, and tenant switching to
              reinforce brand presence.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {industrySpaces.map((space) => (
          <div
            key={space.title}
            className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/80"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${space.gradient}`}
            />
            <div className="flex items-center gap-3 pb-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${space.gradient} text-white`}
              >
                <space.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {space.badge}
                </p>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {space.title}
                </h3>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {space.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {space.stack.map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Menu blueprint
            </p>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Modular navigation primitives
            </h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 dark:border-gray-700 dark:text-gray-200">
            <Cog6ToothIcon className="h-4 w-4" />
            Configure stack
          </button>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {menuBlueprint.map((group) => (
            <div
              key={group.name}
              className="rounded-2xl border border-gray-100 bg-white/70 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
            >
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  {group.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {group.description}
                </p>
              </div>
              <div className="space-y-4">
                {group.items.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-gray-100 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-900/80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          <item.icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-gray-900/5 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-200">
                        {item.badge}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Adaptive menu preview
            </p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Role-aware navigation
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Groups collapse into flyouts on compact mode and expose descriptions
              for new operators.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-900 via-gray-900 to-black p-5 text-white shadow-inner dark:border-gray-800">
            <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Primary menu
              </p>
              <p className="text-lg font-semibold">Atlas Retail • Exec view</p>
            </div>
            <div className="space-y-3">
              {previewNav.map((group) => (
                <div key={group.label}>
                  <p className="text-xs uppercase tracking-wide text-white/60">
                    {group.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {group.modules.map((module) => (
                      <span
                        key={module}
                        className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/80"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Launch accelerators
            </p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Scale-friendly actions
            </h3>
          </div>
          <div className="space-y-4">
            {quickActions.map((action) => (
              <div
                key={action.title}
                className="rounded-2xl border border-gray-100 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-900/80"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${action.accent} text-white`}
                  >
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {action.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Experience states
            </p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              System readiness
            </h3>
          </div>
          <div className="space-y-3">
            {experienceStates.map((experience) => (
              <div
                key={experience.name}
                className="rounded-2xl border border-gray-100 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-900/80"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {experience.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {experience.scenario}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {experience.status}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">
                  Surfaces
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {experience.surfaces}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

