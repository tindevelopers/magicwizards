# 🔗 Core Domain Dependencies

This document maps out all dependencies between core domains, helping developers understand the architecture and avoid circular dependencies.

## 📊 Dependency Matrix

| Domain        | Depends On                    | Depended On By                        |
|---------------|-------------------------------|---------------------------------------|
| **Shared**    | None                          | All domains                           |
| **Database**  | Shared                        | All domains                           |
| **Auth**      | Database, Shared              | Permissions, Multi-Tenancy, Billing   |
| **Multi-Tenancy** | Auth, Database, Shared    | Permissions, Billing                  |
| **Permissions** | Auth, Multi-Tenancy, Database, Shared | Billing (indirectly) |
| **Billing**   | Auth, Multi-Tenancy, Database, Shared | None |

---

## 🎯 Dependency Flow Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                         APPLICATION                            │
│                     (Components, Pages)                        │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        CORE DOMAINS                             │
│                                                                 │
│     ┌──────────┐      ┌──────────────┐      ┌──────────┐     │
│     │ Billing  │──────▶ Multi-Tenancy │──────▶   Auth   │     │
│     └──────────┘      └──────────────┘      └──────────┘     │
│          │                   │                     │           │
│          │                   │                     │           │
│          ▼                   ▼                     ▼           │
│     ┌──────────────────────────────────────────────────┐     │
│     │              Permissions                          │     │
│     └──────────────────────────────────────────────────┘     │
│                              ↓                                 │
│     ┌──────────────────────────────────────────────────┐     │
│     │              Database                             │     │
│     └──────────────────────────────────────────────────┘     │
│                              ↓                                 │
│     ┌──────────────────────────────────────────────────┐     │
│     │              Shared                               │     │
│     └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

**Key:**
- `→` Direct dependency
- `↓` Layer dependency

---

## 📋 Domain-by-Domain Breakdown

### 1. 🔧 SHARED (Foundation Layer)

**Depends On:**
- ❌ Nothing (foundation layer)

**Depended On By:**
- ✅ All other domains

**Exports:**
- Common utilities (`sleep`, `retry`, `debounce`)
- Shared types (`ApiResponse`, `PaginatedResponse`)
- Constants (`APP_CONFIG`, `FEATURES`)
- Validators (`isValidEmail`, `isValidUrl`)

**Purpose:**
Provides common functionality that all domains need, without creating dependencies.

---

### 2. 🗄️ DATABASE (Foundation Layer)

**Depends On:**
- ✅ **Shared** - For utilities and types

**Depended On By:**
- ✅ **Auth** - For user storage
- ✅ **Multi-Tenancy** - For tenant storage
- ✅ **Permissions** - For role storage
- ✅ **Billing** - For subscription storage

**Exports:**
- Database clients (`createClient`, `createAdminClient`)
- Data access functions (`getUser`, `getTenant`, `listRoles`)
- TypeScript types (`Database`)

**Purpose:**
Abstracts all database access, providing a consistent API regardless of underlying database provider.

---

### 3. 🔐 AUTH (Core Layer)

**Depends On:**
- ✅ **Database** - To store/retrieve users
- ✅ **Shared** - For utilities

**Depended On By:**
- ✅ **Multi-Tenancy** - To associate users with tenants
- ✅ **Permissions** - To check user permissions
- ✅ **Billing** - To identify customer

**Exports:**
- Authentication functions (`signIn`, `signUp`, `signOut`)
- Session management (`getCurrentUser`, `getCurrentSession`)
- Password management (`resetPassword`, `updatePassword`)
- Audit logging (`logPermissionCheck`)

**Key Functions Used By Others:**

```typescript
// Multi-Tenancy uses:
import { getCurrentUser } from '@/core/auth';
const user = await getCurrentUser();
const tenantId = user.tenant_id;

// Permissions uses:
import { getCurrentUser } from '@/core/auth';
const user = await getCurrentUser();
const permissions = await getUserPermissions(user.id);

// Billing uses:
import { getCurrentUser } from '@/core/auth';
const user = await getCurrentUser();
const customer = await getCustomerForUser(user.id);
```

---

### 4. 🏢 MULTI-TENANCY (Core Layer)

**Depends On:**
- ✅ **Auth** - To get current user and their tenant
- ✅ **Database** - To store/retrieve tenants
- ✅ **Shared** - For utilities

**Depended On By:**
- ✅ **Permissions** - For tenant-scoped permissions
- ✅ **Billing** - For tenant-specific billing

**Exports:**
- Tenant context (`getCurrentTenant`, `TenantProvider`)
- Tenant resolution (`resolveTenantFromRequest`)
- Tenant validation (`validateTenantAccess`)
- Tenant queries (`createTenantQuery`, `applyTenantFilter`)
- White-label (`getBrandingSettings`, `saveThemeSettings`)

**Key Functions Used By Others:**

```typescript
// Permissions uses:
import { getCurrentTenant } from '@/core/multi-tenancy';
const tenant = await getCurrentTenant();
const permissions = await getTenantPermissions(userId, tenant.id);

// Billing uses:
import { getCurrentTenant } from '@/core/multi-tenancy';
const tenant = await getCurrentTenant();
const subscription = await getActiveSubscription(tenant.id);
```

---

### 5. 🔒 PERMISSIONS (Business Logic Layer)

**Depends On:**
- ✅ **Auth** - To get current user
- ✅ **Multi-Tenancy** - To get tenant context
- ✅ **Database** - To retrieve roles and permissions
- ✅ **Shared** - For utilities

**Depended On By:**
- ⚠️ **Billing** (indirectly) - For permission checks in billing actions

**Exports:**
- Permission checking (`hasPermission`, `requirePermission`)
- React gates (`PermissionGate`, `RoleGate`)
- Permission middleware (`withPermission`)
- Permission definitions (`PERMISSIONS`, `ROLE_PERMISSIONS`)

**Key Functions Used By Others:**

```typescript
// Billing uses (indirectly):
import { requirePermission } from '@/core/permissions';

export async function createCheckoutSession(...) {
  await requirePermission('billing.write');
  // ... billing logic
}
```

---

### 6. 💳 BILLING (Business Logic Layer)

**Depends On:**
- ✅ **Auth** - To identify the user
- ✅ **Multi-Tenancy** - To identify the tenant
- ✅ **Database** - To store subscription data
- ✅ **Shared** - For utilities
- ⚠️ **Permissions** (indirectly) - For permission checks

**Depended On By:**
- ❌ Nothing (top-level domain)

**Exports:**
- Stripe integration (`stripe`, `stripeConfig`)
- Checkout (`createCheckoutSession`, `createBillingPortalSession`)
- Subscriptions (`getActiveSubscription`, `cancelSubscription`)
- Products (`getActiveProductsWithPrices`)
- Stripe Connect (`createConnectAccount`)

**Purpose:**
Handles all payment and subscription logic. Sits at the top of the dependency tree because it needs information from multiple lower layers.

---

## ⚠️ Anti-Patterns to Avoid

### 1. Circular Dependencies

```typescript
// ❌ BAD: Circular dependency
// auth imports from billing
// billing imports from auth

// In @/core/auth:
import { getActiveSubscription } from '@/core/billing'; // ❌

// In @/core/billing:
import { getCurrentUser } from '@/core/auth'; // ✅ This is OK
```

**Solution:** Dependencies should only flow downward (or sideways at the same layer with caution).

### 2. Skipping Layers

```typescript
// ❌ BAD: Application bypasses core domains
import { createClient } from '@supabase/ssr';

// ✅ GOOD: Application uses core abstraction
import { createClient } from '@/core/database';
```

### 3. Tight Coupling

```typescript
// ❌ BAD: Auth directly depends on Stripe
import Stripe from 'stripe';
export async function signUp(email: string) {
  // ... create user
  // ... directly create Stripe customer
  const customer = await stripe.customers.create(...);
}

// ✅ GOOD: Auth triggers an event, Billing listens
export async function signUp(email: string) {
  const user = await createUser(...);
  await emitEvent('user.created', user);
  return user;
}
```

---

## 🛠️ Dependency Injection Pattern

For testability and flexibility, use dependency injection where needed:

```typescript
// Instead of:
export async function createOrder() {
  const user = await getCurrentUser(); // ❌ Hard dependency
  const tenant = await getCurrentTenant();
  // ...
}

// Consider:
export async function createOrder(
  userId: string,
  tenantId: string,
  dependencies = {
    getUser: getUser,
    getTenant: getTenant,
  }
) {
  const user = await dependencies.getUser(userId);
  const tenant = await dependencies.getTenant(tenantId);
  // ...
}

// Now easily testable:
await createOrder(userId, tenantId, {
  getUser: mockGetUser,
  getTenant: mockGetTenant,
});
```

---

## 🔍 Dependency Analysis Tools

### Check for Circular Dependencies

```bash
# Install madge
npm install -g madge

# Check for circular dependencies
madge --circular src/core

# Generate dependency graph
madge --image deps-graph.png src/core
```

### Visualize Dependencies

```bash
# Generate a visual graph
npx depcruise --include-only "^src/core" \
              --output-type dot \
              src/core \
              | dot -T png > dependency-graph.png
```

---

## 📝 Adding a New Domain

When adding a new domain, follow these steps:

### 1. Identify Dependencies

```
NEW DOMAIN: Notifications

Needs:
- Auth (to know who to notify)
- Multi-Tenancy (to know which tenant)
- Database (to store notification preferences)
- Shared (utilities)

Should not depend on:
- Billing (higher layer)
- Permissions (same layer, avoid if possible)
```

### 2. Position in Hierarchy

```
Billing       ← Top layer (business logic)
  ↓
Permissions
  ↓
Multi-Tenancy
  ↓
Auth
  ↓
Notifications ← New domain (business logic)
  ↓
Database      ← Foundation layer
  ↓
Shared        ← Foundation layer
```

### 3. Create Clean API

```typescript
// src/core/notifications/index.ts
export {
  sendEmail,
  sendSMS,
  sendPush,
  getNotificationPreferences,
} from './notifications';

// Only export what's needed!
// Hide implementation details
```

### 4. Document Dependencies

Update this file with:
- Dependencies section
- Depended on by section
- Key functions section
- Examples

---

## 🧪 Testing Cross-Domain Interactions

```typescript
// Test auth → multi-tenancy flow
describe('User tenant association', () => {
  it('should link user to correct tenant', async () => {
    const user = await signUp('user@tenant.com', 'password');
    const tenant = await getCurrentTenant();
    expect(user.tenant_id).toBe(tenant.id);
  });
});

// Test multi-tenancy → billing flow
describe('Tenant billing', () => {
  it('should create subscription for tenant', async () => {
    const tenant = await createTenant({ name: 'Acme' });
    const subscription = await createCheckoutSession(
      tenant.id,
      'price_123',
      '/success',
      '/cancel'
    );
    expect(subscription.tenant_id).toBe(tenant.id);
  });
});
```

---

## 📊 Metrics to Track

### Coupling Metrics

```
Total Dependencies: 15
Average Dependencies per Domain: 2.5
Max Dependencies (Billing): 5
Min Dependencies (Shared): 0

Cyclomatic Complexity: Low ✅
Coupling: Medium ⚠️
Cohesion: High ✅
```

### Recommended Limits

- **Max dependencies per domain:** 5
- **Max layers:** 4
- **Circular dependencies:** 0 (strict)

---

## 🚀 Evolution Strategy

As the codebase grows:

### Phase 1: Current (Modular Monolith)
```
All domains in one codebase (src/core)
```

### Phase 2: Internal NPM Package (6-12 months)
```
Extract core to @yourcompany/saas-core
Install in projects via package.json
```

### Phase 3: Separate Packages (12+ months)
```
@yourcompany/saas-auth
@yourcompany/saas-billing
@yourcompany/saas-multi-tenancy
etc.
```

### Phase 4: Microservices (2+ years, if needed)
```
Auth Service
Billing Service
Tenant Service
etc.
```

**Start simple. Evolve based on pain points, not speculation.**

---

## 📚 Additional Resources

- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Modular Monoliths](https://www.kamilgrzybek.com/design/modular-monolith-primer/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

**Last Updated:** December 2025  
**Maintainer:** Your Team  
**Review Cycle:** Quarterly or when adding new domains




