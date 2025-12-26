# WORKSPACE MANAGER
## Детализация модуля управления пространствами

**Версия:** 1.0  
**Модуль:** 08-WORKSPACES

---

# 1. ИЕРАРХИЯ

```
Organization (Billing Entity)
├── Owner, Plan, Members
└── Workspaces
    ├── Workspace 1 (channels, content, team)
    ├── Workspace 2
    └── Workspace N
```

---

# 2. ORGANIZATIONS

```yaml
organization:
  attributes:
    - id, name, slug, logo
    - owner_id
    - plan_id (starter/growth/pro/enterprise)
    - billing_status (active/past_due/cancelled)
    - stripe_customer_id
```

---

# 3. WORKSPACES

```yaml
workspace:
  attributes:
    - id, organization_id
    - name, slug, description, logo
    - industry (nft/ecommerce/saas/local/other)
    - settings: timezone, require_approval, default_platforms
    
  contains:
    - platform_connections
    - content
    - campaigns
    - templates
    - brand_voice
    - team_members
```

---

# 4. ROLES & PERMISSIONS

| Role | Level | Key Permissions |
|------|-------|-----------------|
| **Owner** | Org | Everything |
| **Admin** | Org | All except transfer ownership |
| **Manager** | Workspace | Manage workspace, approve content |
| **Creator** | Workspace | Create/edit own content |
| **Analyst** | Workspace | View only |

## Permissions Matrix

| Permission | Owner | Admin | Manager | Creator | Analyst |
|------------|-------|-------|---------|---------|---------|
| Manage billing | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage workspace | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create content | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve content | ✅ | ✅ | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ✅ | ✅ |

---

# 5. BILLING

## Plans

| Plan | Price | Workspaces | Members | Posts/mo | AI |
|------|-------|------------|---------|----------|-----|
| Starter | $49 | 1 | 2 | 100 | 50 |
| Growth | $149 | 3 | 5 | 500 | 300 |
| Pro | $399 | 10 | 15 | ∞ | 1000 |
| Enterprise | Custom | ∞ | ∞ | ∞ | ∞ |

## Stripe Integration
- Subscription management
- Proration on upgrades
- Invoice history
- Payment method management

---

# 6. TEAM MANAGEMENT

## Invite Flow
1. Enter email + role
2. Select workspaces
3. Send invitation email
4. User accepts → added to team

## Features
- Pending invitations list
- Role change
- Remove member
- Last activity tracking

---

# 7. AUDIT LOG

## Tracked Events
- Authentication (login, logout)
- Organization (settings, plan changes)
- Workspace (create, update, delete)
- Members (invite, remove, role change)
- Content (create, publish, approve)
- API (key creation, deletion)

---

# 8. API ENDPOINTS

```yaml
# Organizations
GET    /api/organizations/me
PATCH  /api/organizations/me

# Workspaces
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
DELETE /api/workspaces/:id

# Team
GET    /api/workspaces/:id/members
POST   /api/workspaces/:id/members    # Invite
PATCH  /api/workspaces/:id/members/:uid
DELETE /api/workspaces/:id/members/:uid

# Billing
GET    /api/billing
POST   /api/billing/subscribe
GET    /api/billing/invoices

# Audit
GET    /api/audit-log
```

---

# 9. DATA MODELS

```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  planId: string;
  billingStatus: 'active' | 'past_due' | 'cancelled';
  stripeCustomerId?: string;
}

interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  industry: string;
  settings: {
    timezone: string;
    requireApproval: boolean;
  };
}

interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'manager' | 'creator' | 'analyst';
  invitedAt: Date;
  joinedAt?: Date;
}

interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  event: string;
  metadata: object;
  createdAt: Date;
}
```

---

**Следующий файл:** 09-UI-WIREFRAMES.md
