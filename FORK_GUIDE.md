# 🍴 Fork & Customization Guide

This guide will help you fork this SaaS platform template and customize it for your own product.

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR-ORG/YOUR-REPO.git
cd YOUR-REPO

# 3. Run the initialization script
node scripts/initialize-fork.js

# 4. Follow the prompts to configure your project
```

### Option 2: Manual Setup

Follow the steps below to manually customize your fork.

---

## Step-by-Step Customization

### 1. Update Package Names

Update `package.json` in these locations:
- `/package.json` (root)
- `/apps/admin/package.json`
- `/apps/portal/package.json`
- `/packages/@tinadmin/core/package.json`
- `/packages/@tinadmin/config/package.json`
- `/packages/@tinadmin/ui-admin/package.json`
- `/packages/@tinadmin/ui-consumer/package.json`

**Change:**
```json
{
  "name": "@your-org/your-saas-platform",
  "repository": {
    "url": "git+https://github.com/your-org/your-saas-platform.git"
  },
  "bugs": {
    "url": "https://github.com/your-org/your-saas-platform/issues"
  },
  "homepage": "https://github.com/your-org/your-saas-platform#readme",
  "author": "Your Organization"
}
```

### 2. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local and update:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - PLATFORM_ADMIN_EMAIL
# - PLATFORM_ADMIN_PASSWORD
# - Other optional variables
```

### 3. Update Supabase Configuration

**File:** `supabase/config.toml`

```toml
project_id = "your-project-name"
```

### 4. Update Admin Credentials

The following files reference admin credentials. They now use environment variables, but you may want to review:

- `scripts/create-system-admin.ts`
- `src/app/actions/admin/create-platform-admin.ts`
- `supabase/create_platform_admin.sql`
- `supabase/create_admin_user_record.sql`

All now use `process.env.PLATFORM_ADMIN_EMAIL` and `process.env.PLATFORM_ADMIN_PASSWORD`.

### 5. Update Branding & Product Names

Search and replace these terms throughout the codebase:

| Find | Replace With |
|------|--------------|
| `TinAdmin` | Your Product Name |
| `Tin Developers` | Your Company Name |
| `tinadmin.com` | yourcompany.com |
| `@tinadmin` | @your-org |

**Key files to update:**
- `README.md` - Product description and branding
- `src/components/landing/*` - Landing page content
- `src/app/(admin)/*` - Admin UI text
- `docs/*.md` - Documentation references

### 6. Update Package Scope

If you want to change the package scope from `@tinadmin` to your own:

```bash
# Rename package directories
mv packages/@tinadmin packages/@your-org

# Update imports in all files
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/@tinadmin/@your-org/g'

# Update package.json workspace references
# Edit pnpm-workspace.yaml
```

### 7. Customize UI Components

**Branding elements to customize:**
- Logo: `public/images/logo/`
- Favicon: `public/images/favicon.ico`
- Brand colors: `tailwind.config.ts`
- Theme: `src/context/ThemeContext.tsx`

### 8. Update Database Seeds

**Files with example data:**
- `src/app/(admin)/(others-pages)/multi-tenant/page.tsx` - Example tenants
- `supabase/migrations/*.sql` - Seed data

Replace example domains like `acme.tinadmin.com` with your own.

### 9. Configure Deployment

**Vercel:**
```bash
# Update vercel.json if needed
# Set environment variables in Vercel dashboard
# Connect your GitHub repository
```

**Other platforms:**
- Update deployment scripts in `scripts/`
- Configure environment variables
- Set build commands

### 10. Install Dependencies

```bash
# Install all dependencies
pnpm install

# Build packages
pnpm build:packages
```

---

## Checklist

Use this checklist to track your customization progress:

- [ ] Run `node scripts/initialize-fork.js` (or complete manual steps)
- [ ] Update all `package.json` files
- [ ] Create `.env.local` from `.env.example`
- [ ] Update Supabase configuration
- [ ] Replace branding references (TinAdmin → Your Brand)
- [ ] Update logo and favicon
- [ ] Customize theme colors
- [ ] Update README.md
- [ ] Update documentation in `docs/`
- [ ] Test local development: `pnpm dev`
- [ ] Test admin app: `pnpm dev:admin`
- [ ] Test portal app: `pnpm dev:portal`
- [ ] Create platform admin user
- [ ] Deploy to staging
- [ ] Configure production environment variables
- [ ] Deploy to production

---

## Common Customizations

### Change Package Scope

If you want to use `@mycompany` instead of `@tinadmin`:

1. Update `pnpm-workspace.yaml`:
```yaml
packages:
  - 'apps/*'
  - 'packages/@mycompany/*'
```

2. Rename directories:
```bash
mv packages/@tinadmin packages/@mycompany
```

3. Update all imports and references

### Add Custom Features

The template is designed to be extended. Key extension points:

- **New pages:** Add to `src/app/` or `apps/*/app/`
- **New components:** Add to `src/components/` or `apps/*/components/`
- **New API routes:** Add to `src/app/api/` or `apps/*/app/api/`
- **Core modules:** Extend in `packages/@tinadmin/core/src/`

### Customize Navigation

**File:** `src/config/navigation.tsx`

Add, remove, or modify menu items to match your product.

### Customize Permissions

**File:** `packages/@tinadmin/core/src/permissions/permissions.ts`

Define custom permissions for your application.

---

## Troubleshooting

### Package name conflicts

If you see workspace package errors:
```bash
pnpm install --force
```

### Environment variables not loading

Ensure `.env.local` is in the root directory and restart your dev server.

### Supabase connection errors

Check that:
- Supabase is running: `supabase status`
- Environment variables are correct
- Database migrations are applied

### Build errors after renaming

Clear build cache:
```bash
pnpm clean
rm -rf .next .turbo
pnpm install
```

---

## Getting Help

- **Documentation:** Check the `docs/` directory
- **Issues:** Open an issue on the original template repository
- **Community:** Join discussions on GitHub

---

## Contributing Back

If you make improvements that would benefit the template:

1. Fork the original template repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See `CONTRIBUTING.md` for guidelines.

---

## Attribution

This project is forked from the [SaaS Platform Template](https://github.com/the-info-network/tinadmin-saas-base-turborepo).

Consider keeping attribution in your footer or about page:
```
Built with SaaS Platform Template
```

---

## License

This template is MIT licensed. You're free to use it for commercial projects.

See `LICENSE` for full details.

