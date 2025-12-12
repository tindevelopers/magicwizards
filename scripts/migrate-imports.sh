#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# IMPORT MIGRATION SCRIPT
# ═══════════════════════════════════════════════════════════════════════════
# 
# This script helps migrate old imports to the new core domain structure.
# 
# USAGE:
#   chmod +x scripts/migrate-imports.sh
#   ./scripts/migrate-imports.sh
# 
# WHAT IT DOES:
#   1. Finds all old import patterns
#   2. Shows you what will be changed
#   3. Asks for confirmation
#   4. Updates imports to use new @/core structure
# 
# BACKUP:
#   Make sure you have committed your work before running this!
#   git add . && git commit -m "Before import migration"
# 
# ═══════════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  Import Migration Script - Updating to @/core structure"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

# Check if git is clean
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}⚠️  WARNING: You have uncommitted changes!${NC}"
    echo "Please commit your work before running this script."
    echo ""
    echo "Run: git add . && git commit -m 'Before import migration'"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ Git is clean. Safe to proceed.${NC}"
echo ""

# Function to count matches
count_matches() {
    local pattern=$1
    local count=$(grep -r "$pattern" src/ 2>/dev/null | wc -l | tr -d ' ')
    echo $count
}

# Function to show sample matches
show_samples() {
    local pattern=$1
    echo -e "${YELLOW}Samples:${NC}"
    grep -r "$pattern" src/ 2>/dev/null | head -3
    echo ""
}

echo "Analyzing current imports..."
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# AUTH IMPORTS
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}━━━ AUTH IMPORTS ━━━${NC}"

auth_count=$(count_matches "from '@/lib/auth")
if [ "$auth_count" -gt 0 ]; then
    echo "Found $auth_count auth imports to migrate"
    show_samples "from '@/lib/auth"
else
    echo -e "${GREEN}✓ No auth imports to migrate${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# SUPABASE/DATABASE IMPORTS
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}━━━ DATABASE IMPORTS ━━━${NC}"

db_count=$(count_matches "from '@/lib/supabase")
if [ "$db_count" -gt 0 ]; then
    echo "Found $db_count database imports to migrate"
    show_samples "from '@/lib/supabase"
else
    echo -e "${GREEN}✓ No database imports to migrate${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# STRIPE/BILLING IMPORTS
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}━━━ BILLING IMPORTS ━━━${NC}"

billing_count=$(count_matches "from '@/app/actions/stripe")
if [ "$billing_count" -gt 0 ]; then
    echo "Found $billing_count billing imports to migrate"
    show_samples "from '@/app/actions/stripe"
else
    echo -e "${GREEN}✓ No billing imports to migrate${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TENANT IMPORTS
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}━━━ MULTI-TENANCY IMPORTS ━━━${NC}"

tenant_count=$(count_matches "from '@/lib/tenant")
if [ "$tenant_count" -gt 0 ]; then
    echo "Found $tenant_count multi-tenancy imports to migrate"
    show_samples "from '@/lib/tenant"
else
    echo -e "${GREEN}✓ No multi-tenancy imports to migrate${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# ACTIONS IMPORTS
# ═══════════════════════════════════════════════════════════════════════════

echo -e "${BLUE}━━━ ACTION IMPORTS ━━━${NC}"

action_count=$(count_matches "from '@/app/actions")
if [ "$action_count" -gt 0 ]; then
    echo "Found $action_count action imports to migrate"
    show_samples "from '@/app/actions"
else
    echo -e "${GREEN}✓ No action imports to migrate${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# TOTAL
# ═══════════════════════════════════════════════════════════════════════════

total_count=$((auth_count + db_count + billing_count + tenant_count + action_count))

echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "Total imports to migrate: ${YELLOW}$total_count${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

if [ "$total_count" -eq 0 ]; then
    echo -e "${GREEN}✓ All imports are already using the new structure!${NC}"
    exit 0
fi

# Ask for confirmation
echo -e "${YELLOW}⚠️  This will modify $total_count import statements.${NC}"
echo ""
read -p "Do you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Starting migration..."
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# MIGRATION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

migrate_auth() {
    echo "Migrating auth imports..."
    find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
        -e "s|from '@/lib/auth/auth'|from '@/core/auth'|g" \
        -e "s|from '@/lib/auth/permissions'|from '@/core/permissions'|g" \
        -e "s|from '@/lib/auth/permissions-client'|from '@/core/permissions'|g" \
        -e "s|from '@/lib/auth/permission-gates'|from '@/core/permissions'|g" \
        -e "s|from '@/lib/auth/permission-middleware'|from '@/core/permissions'|g" \
        -e "s|from '@/lib/auth/tenant-permissions'|from '@/core/permissions'|g" \
        -e "s|from '@/lib/auth/audit-log'|from '@/core/auth'|g" \
        {} +
    echo -e "${GREEN}✓ Auth imports migrated${NC}"
}

migrate_database() {
    echo "Migrating database imports..."
    find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
        -e "s|from '@/lib/supabase/client'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/server'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/admin-client'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/tenant-client'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/users'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/tenants'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/roles'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/workspaces'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/user-tenant-roles'|from '@/core/database'|g" \
        -e "s|from '@/lib/supabase/organization-admins'|from '@/core/database'|g" \
        {} +
    echo -e "${GREEN}✓ Database imports migrated${NC}"
}

migrate_billing() {
    echo "Migrating billing imports..."
    find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
        -e "s|from '@/lib/stripe/config'|from '@/core/billing'|g" \
        -e "s|from '@/lib/stripe/client'|from '@/core/billing'|g" \
        -e "s|from '@/app/actions/stripe/checkout'|from '@/core/billing'|g" \
        -e "s|from '@/app/actions/stripe/connect'|from '@/core/billing'|g" \
        -e "s|from '@/app/actions/stripe/customers'|from '@/core/billing'|g" \
        -e "s|from '@/app/actions/stripe/payment-methods'|from '@/core/billing'|g" \
        -e "s|from '@/app/actions/stripe/products'|from '@/core/billing'|g" \
        -e "s|from '@/app/actions/stripe/subscriptions'|from '@/core/billing'|g" \
        -e "s|from '@/app/actions/stripe/usage'|from '@/core/billing'|g" \
        {} +
    echo -e "${GREEN}✓ Billing imports migrated${NC}"
}

migrate_tenant() {
    echo "Migrating multi-tenancy imports..."
    find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
        -e "s|from '@/lib/tenant/context'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/lib/tenant/resolver'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/lib/tenant/validation'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/lib/tenant/subdomain-routing'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/lib/tenant/query-builder'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/lib/tenant/server'|from '@/core/multi-tenancy'|g" \
        {} +
    echo -e "${GREEN}✓ Multi-tenancy imports migrated${NC}"
}

migrate_actions() {
    echo "Migrating action imports..."
    find src/ -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
        -e "s|from '@/app/actions/auth'|from '@/core/auth'|g" \
        -e "s|from '@/app/actions/password'|from '@/core/auth'|g" \
        -e "s|from '@/app/actions/tenants'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/app/actions/tenant-roles'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/app/actions/workspaces'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/app/actions/white-label'|from '@/core/multi-tenancy'|g" \
        -e "s|from '@/app/actions/users'|from '@/core/database'|g" \
        -e "s|from '@/app/actions/user'|from '@/core/database'|g" \
        -e "s|from '@/app/actions/permissions'|from '@/core/permissions'|g" \
        {} +
    echo -e "${GREEN}✓ Action imports migrated${NC}"
}

# Run migrations
if [ "$auth_count" -gt 0 ]; then
    migrate_auth
fi

if [ "$db_count" -gt 0 ]; then
    migrate_database
fi

if [ "$billing_count" -gt 0 ]; then
    migrate_billing
fi

if [ "$tenant_count" -gt 0 ]; then
    migrate_tenant
fi

if [ "$action_count" -gt 0 ]; then
    migrate_actions
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Migration complete!${NC}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git diff"
echo "  2. Test your application: npm run dev"
echo "  3. Fix any remaining issues"
echo "  4. Commit the changes: git add . && git commit -m 'Migrate to core domain structure'"
echo ""




