# Magic Wizards – Vercel deployment (Admin + Portal)

Hybrid setup: **Admin** and **Portal** on Vercel; **wizards-api** on Google Cloud Run (separate guide).

Deploy both Next.js apps from this monorepo using two Vercel projects and the same Git repo.

---

## 1. Prerequisites

- [Vercel account](https://vercel.com/signup)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- [pnpm](https://pnpm.io): `npm i -g pnpm`
- Logged in: `vercel login`

---

## 2. Create two Vercel projects (same repo)

1. Go to [vercel.com/new](https://vercel.com/new) and import your Git repository **twice** (or duplicate the project).
2. Name them e.g. **magicwizards-admin** and **magicwizards-portal**.

For **both** projects use:

- **Root Directory:** leave **empty** (repository root).
- **Install Command:** `pnpm install`
- **Framework Preset:** Next.js

Per-project overrides:

| Setting | magicwizards-admin | magicwizards-portal |
|--------|---------------------|----------------------|
| **Build Command** | `pnpm turbo run build --filter=@tinadmin/admin` | `pnpm turbo run build --filter=@tinadmin/portal` |
| **Output Directory** | `apps/admin/.next` | `apps/portal/.next` |

(If you leave Build/Output blank for the admin project, the repo’s root `vercel.json` applies and already points to the admin app.)

**Important:** The root `package.json` script **`"build": "turbo run build --filter=@tinadmin/admin"`** is required so that when Vercel runs `pnpm build` from the repo root (e.g. when Next.js preset overrides the build command), Turbo builds workspace packages (`@tinadmin/integrations-core`, `@tinadmin/integration-gohighlevel`, etc.) before the admin app. Otherwise you get *Module not found: Can't resolve '@tinadmin/integrations-core'*. If you still see that after pulling, in Vercel go to **Deployments → … → Redeploy** and enable **Clear cache and redeploy**.

---

**If portal deployments fail** (e.g. *output directory "apps/admin/.next" was not found at ".../apps/portal/apps/admin/.next"*):

- **Cause:** With Root Directory = `apps/portal`, Vercel was using the repo root `vercel.json` (admin build/output). The repo now has **`apps/portal/vercel.json`** so that when the portal project’s root is `apps/portal`, it uses the portal build and `.next` output there. Redeploy after pulling the latest (no dashboard change required for this fix).
- **Recommended (cleanest):** Use repository root for the portal project. **Option A – Dashboard:** magicwizards-portal → Settings → General → **Root Directory** = empty. Build & Development: Install = `pnpm install`, Build = `pnpm turbo run build --filter=@tinadmin/portal`, Output = `apps/portal/.next`. Node.js = **22.x**.  
  **Option B – API:** `VERCEL_TOKEN=your_token ./scripts/vercel-portal-fix-root.sh`, then `vercel pull --yes` and `vercel --prod --yes`.

## 3. Environment variables

In each project: **Settings → Environment Variables**.

**Admin** (Production / Preview / Development as needed):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For Magic Wizards server actions and admin APIs |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | Stripe |
| `STRIPE_SECRET_KEY` | Optional | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhooks |
| `NEXT_PUBLIC_MULTI_TENANT_ENABLED` | Optional | e.g. `true` |
| `NEXT_PUBLIC_SYSTEM_MODE` | Optional | e.g. `multi-tenant` |

If the admin shows a **Critical Error** on `/signin` (or any page), the app is likely missing the required Supabase env vars. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the admin project’s Environment Variables, then redeploy.

**Portal** (same Supabase; Stripe only if used):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional | |
| `NEXT_PUBLIC_MULTI_TENANT_ENABLED` | Optional | |

---

## 4. Deploy

**Option A – Git (recommended)**  
Push to your connected branch; Vercel builds and deploys each project using the settings above.

**Option B – CLI**  
From the **repository root**:

```bash
# Deploy admin (link to admin project first if needed)
vercel link --yes
# Choose your team and the "magicwizards-admin" project when prompted
vercel --prod

# To deploy portal: link to portal project, then deploy
vercel link --yes
# Choose the "magicwizards-portal" project
vercel --prod
```

Or use the script (see below).

---

## 5. Optional: deploy script from root

From repo root:

```bash
./scripts/deploy-vercel.sh
```

Choose 1 (admin), 2 (portal), or 3 (both). The script runs from the root and uses Turbo; for “both” it will prompt to link to the admin project, deploy, then prompt to link to the portal project and deploy again.

---

## 6. After deploy

- **Supabase Auth redirect URLs:** add your production (and preview) URLs in Supabase Dashboard → Authentication → URL configuration, e.g.  
  `https://magicwizards-admin.vercel.app/**`, `https://magicwizards-portal.vercel.app/**`, `https://*.vercel.app/**`.
- **Custom domains:** in each Vercel project, Settings → Domains (e.g. `admin.yourdomain.com`, `www.yourdomain.com`).

---

## 7. wizards-api (not on Vercel)

The **wizards-api** Express app is intended for **Google Cloud Run** (long timeouts, webhooks). See [Cloud Run deployment](CLOUD_RUN_DEPLOYMENT.md) for build and deploy steps.
