# 🚀 Enterprise SaaS Platform Template

> **Production-ready SaaS starter with multi-tenancy, CRM, Stripe billing, and role-based access control**

A complete, enterprise-grade SaaS platform template built with Next.js 15, Supabase, and Tailwind CSS. Fork this repository to build your own SaaS product in days, not months.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8)](https://tailwindcss.com/)

---

## 🍴 Fork This Template

**Ready to build your SaaS product?**

1. Click the "Use this template" button on GitHub
2. Clone your new repository
3. Run the initialization script:
   ```bash
   node scripts/initialize-fork.js
   ```
4. Start building!

See [**FORK_GUIDE.md**](FORK_GUIDE.md) for detailed customization instructions.

---

## ✨ Complete Feature List

### 🏗️ Architecture
- **Turborepo Monorepo** - Scalable multi-app architecture
- **Dual-Mode Apps** - Admin dashboard + Consumer portal
- **Shared Packages** - Reusable core modules
- **Type-Safe** - Full TypeScript support
- **Server Actions** - Next.js server actions for API routes

### 🔐 Authentication & Authorization
- **Supabase Auth** - Email/password, OAuth, magic links
- **Role-Based Access Control (RBAC)** - Granular permissions
- **Multi-Tenant** - Complete tenant isolation with RLS
- **Platform Admin** - System-level administration
- **Session Management** - Active session monitoring and control
- **Password Management** - Reset, update, strength validation
- **SSO Configuration** - Single Sign-On setup
- **IP Restrictions** - IP whitelisting and blacklisting

### 💳 Billing & Payments
- **Stripe Integration** - Full billing lifecycle
- **Subscription Management** - Create, update, cancel subscriptions
- **Payment Methods** - Add, remove, update cards
- **Billing Dashboard** - Complete billing overview
- **Payment History** - Track all payments and transactions
- **Invoicing** - Generate and manage invoices
- **Tax Settings** - Configure tax rates and rules
- **Failed Payments** - Handle payment failures
- **Refunds** - Process refunds efficiently
- **Billing Portal** - Customer self-service
- **Webhook Handling** - Real-time event processing
- **Subscription Plans** - Create and manage subscription tiers
- **Feature Management** - Define features per plan
- **Usage Limits** - Set and enforce usage limits
- **Subscription History** - Track subscription changes
- **Plan Migration** - Upgrade/downgrade workflows

### 📊 Usage & Metering
- **Usage Dashboard** - Real-time usage monitoring
- **Metered Billing** - Usage-based billing support
- **Usage Reports** - Comprehensive usage reports
- **Usage Alerts** - Usage limit alerts and notifications
- **Rate Limits** - API rate limiting configuration

### 📈 CRM Module
- **Contacts Management** - Complete contact database
- **Companies Management** - Organization records
- **Deals Pipeline** - Sales pipeline with stages
- **Tasks Management** - Task tracking and assignment
- **Activities & Notes** - Activity tracking and notes
- **Deal Stages** - Customizable sales stages
- **Contact Import/Export** - Bulk operations
- **Company Import/Export** - Bulk operations

### 🔗 Integrations
- **CRM Integrations**
  - GoHighLevel - All-in-one CRM and marketing automation
  - Salesforce - Enterprise CRM
  - HubSpot - Inbound marketing and sales
  - Pipedrive - Sales-focused CRM
- **Email Marketing**
  - Mailchimp - Email marketing campaigns
  - SendGrid - Transactional emails
  - ConvertKit - Creator-focused email marketing
  - ActiveCampaign - Marketing automation
- **Telephony**
  - Twilio - Voice and SMS
  - Telnyx - Communications platform
  - Vonage - Cloud communications
- **Payment Processing**
  - Stripe - Payment processing
  - PayPal - Online payments
  - Square - Point of sale
  - Braintree - Payment gateway
- **Analytics**
  - Google Analytics - Web analytics
  - Mixpanel - Product analytics
  - Amplitude - Product intelligence
- **Accounting**
  - QuickBooks - Accounting software
  - Xero - Cloud accounting
  - FreshBooks - Small business accounting
- **E-commerce**
  - Shopify - E-commerce platform
  - WooCommerce - WordPress e-commerce
  - BigCommerce - E-commerce platform
- **Social Media**
  - Facebook - Social media integration
  - Twitter/X - Social media integration
  - LinkedIn - Professional networking
  - Instagram - Social media integration
- **Customer Support**
  - Zendesk - Customer service platform
  - Intercom - Customer messaging platform
  - Freshdesk - Customer support software
- **API Connections** - Manage API connections
- **OAuth Apps** - OAuth application management
- **Integration Settings** - Platform-level configuration
- **Connection Management** - Tenant-level connections

### 🎫 Support System
- **Ticket Management** - Complete support ticket system
- **Ticket Categories** - Organize tickets by category
- **Knowledge Base** - Self-service knowledge base
- **Support Settings** - Configure support workflows
- **Ticket Threading** - Conversation management
- **Attachments** - File attachments for tickets

### 📧 Email & Notifications
- **Email Templates** - Create and manage email templates
- **Email Campaigns** - Email campaign management
- **Email Logs** - Track all sent emails
- **Notification Settings** - Configure notification preferences
- **Transactional Emails** - Resend, SendGrid, AWS SES support

### 🚩 Feature Flags
- **Flag Management** - Create and manage feature flags
- **Environments** - Multi-environment support
- **Targeting** - User targeting for feature flags
- **Flag History** - Feature flag change history

### 📊 Analytics & Reporting
- **Analytics Dashboard** - Comprehensive analytics
- **Custom Reports** - Build custom reports
- **Event Tracking** - Track user events
- **Data Exports** - Export data in various formats
- **Custom Report Builder** - Visual report builder
- **Saved Reports** - Save and share reports
- **Report Templates** - Pre-built report templates
- **Report Sharing** - Share reports with team

### 📦 Data Management
- **Export Jobs** - Schedule and manage data exports
- **Import Templates** - Create import templates
- **Data Mapping** - Map data fields for imports
- **Import/Export History** - Track all data operations

### 🎨 White-Label Configuration
- **Branding** - Customize branding and logos
- **Domain Settings** - Configure custom domains
- **Email Customization** - Customize email templates
- **Theme Settings** - Customize color schemes
- **Custom CSS** - Add custom styling
- **Logo Management** - Upload and manage logos
- **Favicon Settings** - Custom favicon configuration

### 🔌 Webhooks & API
- **Webhook Management** - Create and manage webhooks
- **Webhook Events** - Monitor webhook events
- **Webhook Logs** - View webhook delivery logs
- **Webhook Testing** - Test webhook endpoints
- **API Keys** - Manage API keys and authentication

### 🔒 Security & Compliance
- **Security Settings** - Configure security policies
- **Audit Logs** - Complete audit trail
- **Compliance Tools** - GDPR, SOC2, and other compliance tools
- **Session Management** - Active session monitoring
- **IP Restrictions** - IP whitelisting and blacklisting
- **SSO Configuration** - Single Sign-On setup

### 👥 User & Entity Management
- **User Management** - Complete user administration
- **Tenant Management** - Multi-tenant architecture support
- **Organization Management** - Manage organizations and hierarchies
- **Role Management** - Granular role-based access control (RBAC)
- **User Profiles** - Comprehensive user profile management
- **Workspace Management** - Multi-workspace support
- **User Invitations** - Invite users to tenants
- **Permission Management** - Fine-grained permissions

### 🤖 AI Features
- **AI Chatbot** - AI-powered chatbot integration
- **Code Generator** - AI code generation
- **Image Generator** - AI image generation
- **Text Generator** - AI text generation
- **Video Generator** - AI video generation

### 🧙 Magic Wizards (Agent Platform)
- **Wizard agents** - Builder, research, ops, sales, outreach experts with MCP tools
- **Telegram channel** - Chat with your bot; messages routed by tenant and wizard
- **wizards-api** - Express backend (Cloud Run); webhooks, token proxy, memory, orchestrator
- **System Admin → Magic Wizards** - Link Telegram chat IDs to tenants; add/remove identities; Test Wizard block
- **System Admin → Integrations** - Enable platform integrations (Google, Microsoft, HubSpot, etc.); OAuth per provider
- **Cloud Run + Secret Manager** - Secure env for bot token, Supabase, LLM keys; `scripts/setup-cloudrun-secrets.sh`
- **Portal: My Tools / Wizards** - End-user tools page and Test Wizard

### 📅 Calendar & Scheduling
- **Calendar View** - Full calendar interface
- **Event Management** - Create and manage events
- **Scheduling** - Appointment scheduling
- **Calendar Integration** - External calendar sync

### 📋 Task Management
- **Kanban Boards** - Visual task boards
- **Task Lists** - Task list management
- **Task Assignment** - Assign tasks to users
- **Task Tracking** - Track task progress

### 📊 Charts & Visualizations
- **Bar Charts** - Bar chart visualizations
- **Line Charts** - Line chart visualizations
- **Pie Charts** - Pie chart visualizations
- **Custom Charts** - Build custom charts

### 📁 File Management
- **File Upload** - Upload files and documents
- **File Manager** - File browser and management
- **File Storage** - Supabase storage integration
- **File Sharing** - Share files with team

### 📧 Email Client
- **Inbox** - Email inbox interface
- **Email Details** - View email details
- **Email Composition** - Compose and send emails

### 📝 Forms & Tables
- **Form Builder** - Create custom forms
- **Data Tables** - Advanced data tables
- **Form Validation** - Form validation
- **Table Filtering** - Filter and sort tables

### 🎨 UI Components
- **100+ Components** - Pre-built UI components
- **Dark Mode** - Full dark theme support
- **Responsive Design** - Mobile-first responsive design
- **Component Library** - Reusable component system

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker Desktop (for local Supabase)
- Supabase CLI

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/your-saas-platform.git
cd your-saas-platform

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 4. Start Supabase (local development)
supabase start

# 5. Start development servers
pnpm dev
```

### Access Your Apps

- **Admin Dashboard:** http://localhost:3001
- **Consumer Portal:** http://localhost:3002
- **Wizards API:** http://localhost:8787
- **Web Search MCP:** http://localhost:8080
- **Supabase Studio:** http://localhost:54323

---

## 🧙 Magic Wizards Setup

Magic Wizards is an agent platform: wizard experts (builder, research, ops, sales, outreach) run via **wizards-api**, with **Telegram** as the first channel.

### 1. Telegram bot

1. Create a bot with [@BotFather](https://t.me/BotFather) in Telegram (`/newbot`).
2. Copy the bot token. Put it in `apps/wizards-api/.env`:
   ```bash
   MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN=your-token
   ```
3. (Optional) Generate a webhook secret and set it in Telegram and `.env`:
   ```bash
   openssl rand -hex 32
   # Use in setWebhook URL as &secret_token=... and as MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET
   ```

### 2. Set the Telegram webhook

Point Telegram at your wizards-api URL (e.g. Cloud Run):

```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_WIZARDS_API_URL>/webhooks/telegram&secret_token=<YOUR_SECRET>
```

### 3. Link your chat to a tenant

1. Get your **numeric chat ID** (e.g. message [@userinfobot](https://t.me/userinfobot) — it replies with your Id).
2. In **Admin → System Admin → Magic Wizards**, under **Tenant Telegram Identities**:
   - Select **Platform Tenant** (e.g. TIN).
   - Enter your **Telegram chat id** (e.g. `7949353206`).
   - Click **Add Telegram Identity**.
3. Use **Disable** / **Enable** to turn an identity off or on; use **Remove** to delete it permanently.

### 4. Cloud Run deployment (production)

Deploy wizards-api to Google Cloud Run and store secrets in Secret Manager:

```bash
# One-time: add real values to apps/wizards-api/.env (token, Supabase, LLM keys, webhook secret)
./scripts/setup-cloudrun-secrets.sh
```

This creates secrets, grants the Cloud Run service account access, and updates the service. See [docs/CLOUD_RUN_DEPLOYMENT.md](docs/CLOUD_RUN_DEPLOYMENT.md) for manual build/deploy.

### 5. Using the bot

- Open your bot in Telegram (e.g. `t.me/YourBotName`).
- Send a message (e.g. `hello`). The orchestrator routes to the right wizard.
- Use `/wizard <id> <prompt>` to pick a wizard (e.g. `/wizard research Summarize this`).

See [docs/LOCAL_AGENT_TESTING.md](docs/LOCAL_AGENT_TESTING.md) for dev routes and Test Wizard in Admin/Portal.

---

## 📦 Monorepo Structure

```
.
├── apps/
│   ├── admin/           # Admin dashboard (port 3001)
│   ├── portal/          # Consumer portal (port 3002)
│   ├── wizards-api/     # Magic Wizards backend – Telegram, wizards, MCP (port 8787)
│   └── web-search-mcp/ # Web search MCP server (port 8080)
├── packages/
│   ├── @tinadmin/       # Core SaaS modules (auth, billing, database), config, UI
│   └── @magicwizards/
│       ├── wizards-core/# Wizard definitions, runtime, cost routing, tool classification
│       └── outreach/    # Outreach MCP (campaigns, leads, email) – optional
├── scripts/             # Utility scripts (incl. setup-cloudrun-secrets.sh)
├── supabase/            # Database migrations
└── docs/                # Documentation
```

---

## 🛠️ Development

### Run All Apps

```bash
pnpm dev                 # All apps (admin, portal, wizards-api, web-search-mcp, packages)
pnpm dev --concurrency=15  # If you have 10+ persistent tasks (e.g. on develop with outreach)
pnpm dev:admin          # Admin only
pnpm dev:portal         # Portal only
pnpm dev:wizards-api    # Wizards API only
```

### Build

```bash
pnpm build:all          # Build everything
pnpm build:admin        # Build admin app
pnpm build:portal       # Build portal app
pnpm build:wizards-api  # Build wizards-api
pnpm build:wizards-core # Build wizard definitions/runtime (required before wizards-api)
pnpm build:packages     # Build packages only
```

### Database

```bash
pnpm supabase:start     # Start local Supabase
pnpm supabase:stop      # Stop Supabase
pnpm supabase:status    # Check status
pnpm supabase:reset     # Reset database
pnpm supabase:env:remote # Install remote Supabase env vars
pnpm supabase:sync-vercel # Sync Vercel URLs to Supabase
pnpm supabase:apply-integration-migration # Apply integration migration
```

### Create Platform Admin

```bash
# Option 1: Use the script
npx tsx scripts/create-system-admin.ts

# Option 2: Use the UI
# Navigate to: http://localhost:3001/admin/create-platform-admin
```

---

## 🚢 Deployment

### Vercel (Admin & Portal)

```bash
# Deploy both apps
./scripts/deploy-vercel.sh

# Or deploy individually
vercel --cwd apps/admin
vercel --cwd apps/portal
```

Recommended project names: **magicwizards-admin**, **magicwizards-portal**. See [docs/VERCEL_HYBRID_DEPLOYMENT.md](docs/VERCEL_HYBRID_DEPLOYMENT.md).

### Cloud Run (wizards-api)

The wizards-api (Telegram webhook, wizard runtime) is deployed to **Google Cloud Run**:

```bash
# Secure: create Secret Manager secrets and update Cloud Run (requires apps/wizards-api/.env with real values)
./scripts/setup-cloudrun-secrets.sh

# Or manual build + deploy
gcloud builds submit --config=cloudbuild.wizards-api.yaml --project=magicwizards
gcloud run deploy wizards-api --image=... --set-secrets=...  # see docs
```

See [docs/CLOUD_RUN_DEPLOYMENT.md](docs/CLOUD_RUN_DEPLOYMENT.md) for full steps.

### Environment Variables

Set these in your deployment platform:

**Required (Admin/Portal):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Required (wizards-api on Cloud Run):**
- `MAGIC_WIZARDS_TELEGRAM_BOT_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- At least one LLM key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`

**Optional:**
- `STRIPE_*`, `EMAIL_PROVIDER`, email API keys
- `MAGIC_WIZARDS_TELEGRAM_WEBHOOK_SECRET`, `WIZARDS_API_PUBLIC_URL`

See [`.env.example`](.env.example) for complete list.

---

## 📚 Documentation

- [**Fork Guide**](FORK_GUIDE.md) - How to customize your fork
- [**Developer Guide**](docs/DEVELOPER_GUIDE.md) - Advanced development
- [**Architecture**](docs/ARCHITECTURE.md) - System design
- [**Multi-Tenancy**](docs/MULTITENANT_ARCHITECTURE.md) - Tenant isolation
- [**Stripe Setup**](docs/STRIPE_SETUP.md) - Payment integration
- [**Deployment**](docs/DEPLOYMENT.md) - Production deployment
- [**User Guide**](docs/USER_GUIDE.md) - End-user documentation

**Magic Wizards:**
- [**Local Agent Testing**](docs/LOCAL_AGENT_TESTING.md) - Run wizards-api locally, dev route, Test Wizard
- [**Cloud Run Deployment**](docs/CLOUD_RUN_DEPLOYMENT.md) - Deploy wizards-api to Google Cloud Run
- [**Vercel Hybrid Deployment**](docs/VERCEL_HYBRID_DEPLOYMENT.md) - Admin/Portal on Vercel, wizards-api on Cloud Run
- [**Microsoft 365 Mail Setup**](docs/MICROSOFT_365_MAIL_SETUP.md) - OAuth and token proxy for Microsoft
- [**Deploy MCP Servers**](docs/DEPLOY_MCP_SERVERS.md) - Google Workspace, HubSpot, web-search MCP

---

## 🎯 Core Modules

### Authentication (`@tinadmin/core/auth`)
- User authentication and session management
- Password reset and email verification
- OAuth provider integration
- Audit logging

### Billing (`@tinadmin/core/billing`)
- Stripe subscription management
- Invoice generation and tracking
- Payment method handling
- Usage-based billing

### Database (`@tinadmin/core/database`)
- Supabase client configuration
- Row-level security (RLS)
- Type-safe queries
- Admin operations

### Multi-Tenancy (`@tinadmin/core/multi-tenancy`)
- Tenant isolation and context
- Subdomain routing
- Workspace management
- Organization hierarchy

### Permissions (`@tinadmin/core/permissions`)
- Role-based access control
- Permission gates and middleware
- Tenant-level permissions
- Platform admin privileges

---

## 🔧 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.9 |
| **Styling** | Tailwind CSS 4.0 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Payments** | Stripe |
| **Email** | Resend / SendGrid / AWS SES |
| **Monorepo** | Turborepo + pnpm |
| **Deployment** | Vercel / Railway / Docker |
| **Charts** | Recharts & ApexCharts |
| **Calendar** | FullCalendar |
| **Icons** | Heroicons |

---

## 📊 Features Breakdown

### Admin Dashboard
- Multi-tenant management
- User and role management
- CRM (contacts, deals, activities)
- Analytics and reporting
- Billing and subscriptions
- Settings and configuration
- Audit logs
- **System Admin → Magic Wizards** – Telegram identities (add/disable/remove), Test Wizard, MCP servers
- **System Admin → Integrations** – Platform integrations (Google, Microsoft, HubSpot, etc.)
- Integrations management (tenant-level)
- Support ticket system
- Feature flags
- White-label configuration
- Webhook management

### Consumer Portal
- User registration and onboarding
- Profile management
- Billing and invoices
- Support tickets
- Documentation

### Platform Features
- White-label branding per tenant
- Custom domains
- Email templates
- Webhook integrations
- API access
- Export/import data
- AI-powered features
- Calendar integration
- File management

---

## 🧪 Testing

```bash
pnpm test              # Run all tests
pnpm type-check        # TypeScript validation
pnpm lint              # ESLint
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Stripe](https://stripe.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Turborepo](https://turbo.build/)

---

## 📞 Support

- **Documentation:** See `docs/` directory
- **Issues:** [GitHub Issues](https://github.com/your-org/your-saas-platform/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/your-saas-platform/discussions)

---

## 🗺️ Roadmap

- [ ] GraphQL API support
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] AI/ML integrations
- [ ] Marketplace/plugin system
- [ ] Multi-language support (i18n)

---

**⭐ If this template helped you, please star the repository!**
