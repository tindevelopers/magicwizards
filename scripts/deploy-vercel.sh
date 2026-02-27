#!/bin/bash

# Magic Wizards – Vercel deployment (Admin + Portal)
# Run from repository root. Uses Turbo to build; each app is a separate Vercel project.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Magic Wizards – Vercel deployment"
echo "=================================="
echo ""

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Install: npm install -g vercel"
    exit 1
fi

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "pnpm is not installed. Install: npm install -g pnpm"
    exit 1
fi

# Check login
if ! vercel whoami &> /dev/null; then
    echo "Not logged in to Vercel. Run: vercel login"
    exit 1
fi

echo "Prerequisites OK. Deploying from: $ROOT_DIR"
echo ""

deploy_admin() {
    echo "Deploying Admin app (magicwizards-admin)..."
    vercel link --yes --project magicwizards-admin 2>/dev/null || true
    vercel --prod --yes
    echo "Admin deployed."
    echo ""
}

deploy_portal() {
    echo "Deploying Portal app (magicwizards-portal)..."
    echo "Ensure the portal project has Build/Output overrides in Vercel Dashboard (see docs/VERCEL_HYBRID_DEPLOYMENT.md)."
    vercel link --yes --project magicwizards-portal 2>/dev/null || true
    vercel --prod --yes
    echo "Portal deployed."
    echo ""
}

echo "Which app(s) do you want to deploy?"
echo "  1) Admin only"
echo "  2) Portal only"
echo "  3) Both (Admin, then Portal)"
echo ""
read -p "Choice (1–3): " choice

case $choice in
    1) deploy_admin ;;
    2) deploy_portal ;;
    3) deploy_admin; deploy_portal ;;
    *)
        echo "Invalid choice. Use 1, 2, or 3."
        exit 1
        ;;
esac

echo "Done. Configure env vars and redirect URLs in Vercel and Supabase if needed."
echo "See: docs/VERCEL_HYBRID_DEPLOYMENT.md"
