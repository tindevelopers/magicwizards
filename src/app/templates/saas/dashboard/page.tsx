import ApiKeyTable from "@/components/api-keys/ApiKeyTable";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TaskList from "@/components/task/task-list/TaskList";
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BoltIcon,
  ChartBarIcon,
  CircleStackIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentCheckIcon,
  EnvelopeOpenIcon,
  GlobeAltIcon,
  IdentificationIcon,
  KeyIcon,
  LockClosedIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
  UsersIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Image from "next/image";
import React from "react";

export const metadata: Metadata = {
  title: "SaaS Dashboard | TailAdmin Template",
  description:
    "Software-as-a-Service dashboard showcasing user management, roles, API governance, and the core modules every SaaS platform needs.",
};

const kpiCards = [
  {
    label: "Active customers",
    value: "12,480",
    change: "+8.4% MoM",
    subLabel: "Across 37 workspaces",
    icon: UserGroupIcon,
  },
  {
    label: "Net revenue",
    value: "$482K",
    change: "+$54K",
    subLabel: "Expansion + billing",
    icon: WalletIcon,
  },
  {
    label: "API throughput",
    value: "2.4B",
    change: "99.97% uptime",
    subLabel: "p95 180ms",
    icon: ArrowPathIcon,
  },
  {
    label: "Security posture",
    value: "SOC 2 + HIPAA",
    change: "24 open tasks",
    subLabel: "Next audit in 18d",
    icon: ShieldCheckIcon,
  },
];

const userDirectory = [
  {
    name: "Ava Patel",
    email: "ava@atlasretail.com",
    role: "Platform Admin",
    plan: "Enterprise",
    status: "Active",
    lastActive: "2m ago",
    avatar: "/images/user/user-17.jpg",
  },
  {
    name: "Marcus Reed",
    email: "m.reed@northwind.finance",
    role: "Billing Owner",
    plan: "Enterprise",
    status: "Active",
    lastActive: "12m ago",
    avatar: "/images/user/user-13.jpg",
  },
  {
    name: "Isabella Chen",
    email: "isabella@lumenhealth.io",
    role: "Security Analyst",
    plan: "Healthcare",
    status: "Pending",
    lastActive: "Invite sent",
    avatar: "/images/user/user-18.jpg",
  },
  {
    name: "Diego Alvarez",
    email: "diego@auroraapps.dev",
    role: "Developer",
    plan: "Growth",
    status: "Active",
    lastActive: "1h ago",
    avatar: "/images/user/user-20.jpg",
  },
  {
    name: "Noor Alvi",
    email: "noor@orbitmobility.com",
    role: "Support Lead",
    plan: "Enterprise",
    status: "Suspended",
    lastActive: "24h ago",
    avatar: "/images/user/user-12.jpg",
  },
  {
    name: "Emily Brooks",
    email: "emily@evergreen.edu",
    role: "Workspace Admin",
    plan: "Education",
    status: "Active",
    lastActive: "4m ago",
    avatar: "/images/user/user-11.jpg",
  },
];

const rolePlaybooks = [
  {
    role: "Platform Admin",
    description: "Full system control, audit exports, billing + API scope.",
    coverage: "Global",
    seats: "32 / 40",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    role: "Workspace Admin",
    description: "Brand, roles, data residency, tenant level automations.",
    coverage: "Regional",
    seats: "128 / 180",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    role: "Billing Owner",
    description: "Plan changes, usage alerts, dunning + collections.",
    coverage: "Per tenant",
    seats: "44 / 60",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    role: "Developer",
    description: "API keys, webhooks, environments, feature flags.",
    coverage: "Per project",
    seats: "310 / 500",
    gradient: "from-sky-500 to-blue-500",
  },
];

const authSignals = [
  {
    title: "SSO providers",
    value: "Okta, Azure AD, Google, OneLogin",
    icon: GlobeAltIcon,
  },
  {
    title: "MFA enforcement",
    value: "84% tenants forced • SMS + TOTP + Passkey",
    icon: LockClosedIcon,
  },
  {
    title: "Session policy",
    value: "12h max • 10 min idle • device binding",
    icon: UsersIcon,
  },
  {
    title: "Audit webhooks",
    value: "Real-time streaming to SIEM",
    icon: DocumentCheckIcon,
  },
];

const developerStreams = [
  {
    title: "Webhooks",
    value: "38 events",
    subtitle: "Real-time for billing, users, health",
    icon: ArrowPathIcon,
  },
  {
    title: "SDK coverage",
    value: "JS • Python • Go • Kotlin",
    subtitle: "Typed, versioned, linted",
    icon: CpuChipIcon,
  },
  {
    title: "Sandbox latency",
    value: "180ms p95",
    subtitle: "Multi-region edge",
    icon: ServerStackIcon,
  },
];

const quickAutomations = [
  {
    title: "Bulk invite",
    description: "Sync HRIS, CSV, or SCIM users in one click.",
    icon: CloudArrowUpIcon,
  },
  {
    title: "Adaptive roles",
    description: "Blueprint roles per industry & auto-apply policies.",
    icon: IdentificationIcon,
  },
  {
    title: "Usage alerts",
    description: "Notify billing owners when spend hits guardrails.",
    icon: EnvelopeOpenIcon,
  },
];

const coveragePillars = [
  {
    title: "Billing & plans",
    description: "Seat, usage, prepaid, and marketplace entitlements.",
    icon: WalletIcon,
  },
  {
    title: "User & RBAC",
    description: "Granular roles, teams, SCIM, policy versions.",
    icon: UsersIcon,
  },
  {
    title: "API & extensibility",
    description: "Keys, webhooks, SDKs, rate limits, schema registry.",
    icon: KeyIcon,
  },
  {
    title: "Analytics & health",
    description: "Product usage, cohort retention, anomaly alerts.",
    icon: ChartBarIcon,
  },
  {
    title: "Security & compliance",
    description: "Audit trails, data residency, encryption controls.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Support & success",
    description: "Playbooks, SLAs, in-app guidance, status pages.",
    icon: SparklesIcon,
  },
  {
    title: "Automation & tasks",
    description: "Lifecycle workflows, renewals, onboarding checklists.",
    icon: Cog6ToothIcon,
  },
];

const governanceControls = [
  {
    title: "Data residency",
    value: "US • EU • APAC • GovCloud",
    icon: GlobeAltIcon,
  },
  {
    title: "Compliance",
    value: "SOC 2, HIPAA, ISO 27001, GDPR, PCI",
    icon: ShieldCheckIcon,
  },
  {
    title: "Key rotation",
    value: "Every 90 days • FIPS validated HSM",
    icon: KeyIcon,
  },
  {
    title: "Feature flags",
    value: "15 live experiments segmented by tenant tier",
    icon: Squares2X2Icon,
  },
];

const releaseHighlights = [
  {
    title: "Granular data export policies",
    status: "Shipping",
    owner: "Security",
    detail: "Per-field masking & legal hold ready",
  },
  {
    title: "Usage-based starter plans",
    status: "Pilot",
    owner: "Billing",
    detail: "Tiered pricing, real-time invoices",
  },
  {
    title: "AI assistant for admins",
    status: "Design",
    owner: "Product",
    detail: "Proactive insights & config suggestions",
  },
];

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    Active:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    Pending:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    Suspended:
      "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
};

export default function SaasDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 p-8 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-indigo-500 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-fuchsia-500 blur-[140px]" />
        </div>
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-xs uppercase tracking-wide text-white/80">
              <ArrowTrendingUpIcon className="h-4 w-4" />
              SaaS operating system
            </p>
            <h1 className="text-4xl font-semibold leading-tight lg:text-5xl">
              Run every tenant, user, and API from one control plane.
            </h1>
            <p className="max-w-2xl text-white/70">
              This base UI stitches together the essentials for 95% of SaaS
              products: user lifecycle, adaptive roles, API governance, billing,
              analytics, and operational tasks—pre-integrated with TailAdmin
              components so you can drop in your logic.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="sm" className="bg-white text-slate-900">
                Launch live blueprint
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/30 text-white"
              >
                View developer guide
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-lg gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur">
            {kpiCards.map((kpi) => (
              <div
                key={kpi.label}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/60">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-semibold">{kpi.value}</p>
                  <p className="text-xs text-white/70">{kpi.subLabel}</p>
                </div>
                <div className="text-right">
                  <kpi.icon className="h-6 w-6 text-white/80" />
                  <span className="text-xs text-emerald-300">{kpi.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                User management
              </p>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Directory + tenant roles
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Real-time sync, policy aware, SCIM ready.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden sm:block">
                <input
                  type="search"
                  placeholder="Search people, emails..."
                  className="h-10 rounded-full border border-gray-200 bg-white/70 px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
              </div>
              <Button variant="outline" size="sm">
                Export CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar rounded-2xl border border-gray-100 dark:border-gray-800">
            <Table className="divide-y divide-gray-100 dark:divide-gray-800">
              <TableHeader className="bg-gray-50/80 dark:bg-gray-800/60">
                <TableRow>
                  {["User", "Role", "Plan", "Status", "Last active"].map(
                    (label) => (
                      <TableCell
                        key={label}
                        isHeader
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        {label}
                      </TableCell>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white dark:bg-gray-900">
                {userDirectory.map((user) => (
                  <TableRow
                    key={user.email}
                    className="border-b border-gray-100 last:border-none dark:border-gray-800"
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-full">
                          <Image
                            src={user.avatar}
                            alt={user.name}
                            width={40}
                            height={40}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {user.role}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {user.plan}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {user.lastActive}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Role intelligence
            </p>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Adaptive RBAC matrix
            </h3>
          </div>
          <div className="space-y-4">
            {rolePlaybooks.map((role) => (
              <div
                key={role.role}
                className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {role.role}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {role.description}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full bg-gradient-to-r ${role.gradient} px-3 py-1 text-xs font-semibold text-white`}
                  >
                    {role.coverage}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Seats • {role.seats}</span>
                  <button className="text-indigo-500">Edit policy</button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Invite teammate
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="team@company.com"
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
                <div className="relative">
                  <select
                    id="invite-role"
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 pr-10 text-sm text-gray-700 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {rolePlaybooks.map((role) => (
                      <option
                        key={role.role}
                        className="bg-white text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        {role.role}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    ▼
                  </span>
                </div>
              </div>
              <Button size="sm" className="w-full">
                Send invite
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Authentication & trust
            </p>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Modern identity stack
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Bring every tenant up to enterprise-grade identity with SSO,
              multi-factor, adaptive roles, and a prebuilt reset experience that
              matches TailAdmin&apos;s UI kit.
            </p>
            <div className="space-y-3">
              {authSignals.map((signal) => (
                <div
                  key={signal.title}
                  className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    <signal.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {signal.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {signal.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800">
            <ResetPasswordForm />
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-3">
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 2xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                API management
              </p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Keys, environments, rate limits
              </h3>
            </div>
            <Button size="sm" variant="outline">
              View docs
            </Button>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ApiKeyTable />
            <div className="space-y-4 rounded-2xl border border-gray-100 p-5 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Developer health
              </p>
              <div className="space-y-4">
                {developerStreams.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      <item.icon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.value}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-dashed border-indigo-200 p-4 text-sm text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-200">
                <p className="font-semibold">Upcoming</p>
                <p>Scoped service tokens & per-environment rate limits.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Automation
          </p>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Operational accelerators
          </h3>
          <div className="space-y-4">
            {quickAutomations.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <item.icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Execution
              </p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Launch & success checklist
              </h3>
            </div>
            <Button size="sm" variant="outline">
              Share board
            </Button>
          </div>
          <div className="mt-4 rounded-2xl border border-gray-100 p-2 dark:border-gray-800">
            <TaskList />
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            SaaS coverage
          </p>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            What 95% of SaaS products need
          </h3>
          <div className="space-y-4">
            {coveragePillars.map((pillar) => (
              <div
                key={pillar.title}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {pillar.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {pillar.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Governance
          </p>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Controls & assurances
          </h3>
          <div className="mt-4 space-y-4">
            {governanceControls.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Releases
          </p>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            What&apos;s next
          </h3>
          <div className="mt-4 space-y-4">
            {releaseHighlights.map((release) => (
              <div
                key={release.title}
                className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {release.title}
                  </p>
                  <span className="text-xs font-medium text-indigo-500">
                    {release.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {release.detail}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Owner • {release.owner}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Data fabric
          </p>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Warehouses & syncs
          </h3>
          <div className="mt-4 space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 dark:border-gray-800">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  CircleStack
                </p>
                <p>Nightly full sync</p>
              </div>
              <CircleStackIcon className="h-6 w-6 text-indigo-500" />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 dark:border-gray-800">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  Snowflake
                </p>
                <p>Real-time CDC</p>
              </div>
              <Squares2X2Icon className="h-6 w-6 text-sky-500" />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3 dark:border-gray-800">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  BigQuery
                </p>
                <p>PII stripped + masked</p>
              </div>
              <BoltIcon className="h-6 w-6 text-amber-500" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

