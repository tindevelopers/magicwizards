# Role Hierarchy - Google/HubSpot Style

This document outlines the role structure following Google Workspace and HubSpot's organization model.

## 🔹 Tenant Admin (Platform-Level Authority)

**What it is:** The root administrator who owns and controls the entire SaaS platform/tenant.

### Powers and Responsibilities:

| Capability | Description |
|------------|-------------|
| Full platform control | Modify all system-level settings and configurations |
| Domain management | Add/remove domains, configure DNS, SSL certificates |
| All users & tenants | Create, modify, delete any user or organization |
| Security policies | Global MFA, SSO, conditional access, compliance rules |
| Billing & licensing | Subscription management, product entitlements, renewals |
| Cannot be restricted | Top-level authority, no one can limit their access |

**Real-World Equivalent:**
- Google Workspace: *Super Admin*
- HubSpot: *Super Admin*
- Building analogy: *Building Owner*

**Technical Implementation:**
- `users.tenant_id = NULL` (not tied to any specific tenant)
- `users.role_id` = "Tenant Admin"
- Bypasses all RLS policies
- Has access to all data across all organizations

---

## 🔹 Organization Admin (Company-Level Authority)

**What it is:** Administrator who manages their company/organization within the platform, but doesn't control the platform itself.

### Powers and Responsibilities:

| Capability | Description |
|------------|-------------|
| Manage organization users | Add, edit, remove users within their organization |
| Team & role management | Create teams, assign roles, manage permissions |
| Access to org tools | Configure apps, workflows, integrations for their org |
| Staff operations | Onboarding, offboarding, access provisioning |
| **Cannot** modify tenant settings | No domain setup, global security policies, or billing |
| **Cannot** see other orgs | Isolated to their organization's data only |

**Real-World Equivalent:**
- Google Workspace: *Admin* (Organization-level)
- HubSpot: *Account Admin*
- Building analogy: *Office Manager*

**Technical Implementation:**
- `users.tenant_id = <their_org_id>` (tied to specific organization)
- `users.role_id` = "Organization Admin"
- Subject to RLS policies for their tenant
- Can only access data within their organization

---

## 📊 Comparison Table

| Aspect | Tenant Admin | Organization Admin |
|--------|--------------|-------------------|
| **Scope** | Entire platform | Single organization |
| **User Management** | All users | Organization users only |
| **Domain Control** | ✅ Yes | ❌ No |
| **Billing Access** | ✅ Full | ❌ View only (their org) |
| **Security Policies** | ✅ Global | ❌ Org-level only |
| **Multi-Org Visibility** | ✅ All orgs | ❌ Their org only |
| **RLS Restrictions** | ❌ Bypassed | ✅ Applied |
| **Can be restricted** | ❌ No | ✅ Yes (by Tenant Admin) |

---

## 🔄 Other Roles (Within Organization)

### Billing Owner
- Manages billing and subscriptions for their organization
- View/update payment methods, invoices
- Cannot manage users or security

### Developer
- API access and integrations
- Deploy and manage applications
- Limited user management

### Viewer
- Read-only access to organization data
- Cannot modify settings or users
- Reporting and analytics only

---

## 🏗️ Real-World Examples

### Google Workspace Style:
```
Tenant Admin (Super Admin)
└── Organization: Acme Corp
    ├── Organization Admin (Admin)
    ├── Billing Owner
    ├── Developer
    └── Viewer (User)
```

### HubSpot Style:
```
Tenant Admin (Super Admin)
└── Account: Acme Marketing
    ├── Organization Admin (Account Admin)
    ├── Billing Owner (Billing Admin)
    ├── Developer (Developer)
    └── Viewer (Basic User)
```

---

## 🔐 Technical Implementation Notes

### Tenant Admin Detection:
```typescript
const isTenantAdmin = user.role_id === "Tenant Admin" && user.tenant_id === null;
```

### Organization Admin Detection:
```typescript
const isOrgAdmin = user.role_id === "Organization Admin" && user.tenant_id !== null;
```

### Multi-Role Support:
A Tenant Admin can also have an Organization Admin role for a specific tenant via `user_tenant_roles`:
```typescript
// Platform-level access
users.role_id = "Tenant Admin"
users.tenant_id = NULL

// Also manage Acme Corp as Org Admin
user_tenant_roles:
  - user_id: <tenant_admin_id>
  - tenant_id: <acme_corp_id>
  - role_id: "Organization Admin"
```

This allows a Tenant Admin to "wear two hats" - platform oversight + hands-on org management.

