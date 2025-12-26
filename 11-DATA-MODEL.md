# DATA MODEL
## Модель данных

**Версия:** 1.0  
**Модуль:** 11-DATA-MODEL

---

# 1. ENTITY RELATIONSHIP DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  User ──────┐                                               │
│             │                                                │
│  Organization ────── OrganizationMember                     │
│       │                                                      │
│       └── Workspace ──── WorkspaceMember                    │
│               │                                              │
│               ├── Content ──── Publication                  │
│               │       │            │                        │
│               │       │       PublicationPlatform           │
│               │       │                                      │
│               ├── Campaign                                  │
│               ├── Template                                  │
│               ├── BrandVoice                                │
│               ├── PlatformConnection                        │
│               ├── ApiKey                                    │
│               ├── Webhook                                   │
│               └── RecurringPost                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

# 2. CORE TABLES

## Users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    email_verified  BOOLEAN DEFAULT FALSE,
    password_hash   VARCHAR(255),
    name            VARCHAR(255),
    avatar_url      VARCHAR(512),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

## Organizations

```sql
CREATE TABLE organizations (
    id                  UUID PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) UNIQUE NOT NULL,
    owner_id            UUID REFERENCES users(id),
    plan_id             VARCHAR(50) DEFAULT 'starter',
    billing_status      VARCHAR(20) DEFAULT 'active',
    stripe_customer_id  VARCHAR(100),
    created_at          TIMESTAMP DEFAULT NOW()
);
```

## Workspaces

```sql
CREATE TABLE workspaces (
    id              UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    industry        VARCHAR(50),
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);
```

## Workspace Members

```sql
CREATE TABLE workspace_members (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    user_id         UUID REFERENCES users(id),
    role            VARCHAR(20) NOT NULL,
    invited_at      TIMESTAMP DEFAULT NOW(),
    joined_at       TIMESTAMP,
    UNIQUE(workspace_id, user_id)
);
```

---

# 3. CONTENT TABLES

## Content

```sql
CREATE TABLE content (
    id                  UUID PRIMARY KEY,
    workspace_id        UUID REFERENCES workspaces(id),
    original_text       TEXT NOT NULL,
    adapted_versions    JSONB DEFAULT '{}',
    media               JSONB DEFAULT '[]',
    content_type        VARCHAR(50),
    strategy            VARCHAR(50),
    template_id         UUID REFERENCES templates(id),
    campaign_id         UUID REFERENCES campaigns(id),
    ai_generated        BOOLEAN DEFAULT FALSE,
    status              VARCHAR(20) DEFAULT 'draft',
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP DEFAULT NOW()
);
```

## Templates

```sql
CREATE TABLE templates (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    platforms       VARCHAR(50)[],
    variables       JSONB NOT NULL,
    structure       JSONB NOT NULL,
    is_system       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

## Brand Voice

```sql
CREATE TABLE brand_voices (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id) UNIQUE,
    config          JSONB NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

# 4. PUBLISHING TABLES

## Platform Connections

```sql
CREATE TABLE platform_connections (
    id                  UUID PRIMARY KEY,
    workspace_id        UUID REFERENCES workspaces(id),
    platform            VARCHAR(50) NOT NULL,
    access_token        TEXT NOT NULL,
    refresh_token       TEXT,
    platform_username   VARCHAR(255),
    channel_id          VARCHAR(255),
    status              VARCHAR(20) DEFAULT 'active',
    created_at          TIMESTAMP DEFAULT NOW()
);
```

## Publications

```sql
CREATE TABLE publications (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    content_id      UUID REFERENCES content(id),
    status          VARCHAR(20) DEFAULT 'scheduled',
    priority        VARCHAR(20) DEFAULT 'normal',
    scheduled_at    TIMESTAMP NOT NULL,
    approval_status VARCHAR(20),
    approved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

## Publication Platforms

```sql
CREATE TABLE publication_platforms (
    id              UUID PRIMARY KEY,
    publication_id  UUID REFERENCES publications(id),
    platform        VARCHAR(50) NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    platform_post_id VARCHAR(255),
    url             VARCHAR(512),
    published_at    TIMESTAMP,
    error_code      VARCHAR(100),
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0
);
```

---

# 5. CAMPAIGN TABLES

## Campaigns

```sql
CREATE TABLE campaigns (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE,
    channels        VARCHAR(50)[],
    status          VARCHAR(20) DEFAULT 'draft',
    metrics         JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

## A/B Tests

```sql
CREATE TABLE ab_tests (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    platform        VARCHAR(50) NOT NULL,
    test_type       VARCHAR(20) NOT NULL,
    variants        JSONB NOT NULL,
    status          VARCHAR(20) DEFAULT 'draft',
    winner_id       VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

## Recurring Posts

```sql
CREATE TABLE recurring_posts (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    schedule_type   VARCHAR(20) NOT NULL,
    schedule_config JSONB NOT NULL,
    content_type    VARCHAR(20) NOT NULL,
    platforms       VARCHAR(50)[],
    status          VARCHAR(20) DEFAULT 'active',
    next_run_at     TIMESTAMP NOT NULL,
    run_count       INTEGER DEFAULT 0
);
```

---

# 6. INTEGRATION TABLES

## API Keys

```sql
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    name            VARCHAR(255) NOT NULL,
    key_hash        VARCHAR(255) NOT NULL,
    key_prefix      VARCHAR(20) NOT NULL,
    type            VARCHAR(10) DEFAULT 'live',
    permissions     VARCHAR(50)[],
    last_used_at    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

## Webhooks

```sql
CREATE TABLE webhooks (
    id              UUID PRIMARY KEY,
    workspace_id    UUID REFERENCES workspaces(id),
    url             VARCHAR(512) NOT NULL,
    secret          VARCHAR(255) NOT NULL,
    events          VARCHAR(100)[],
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW()
);
```

## Webhook Deliveries

```sql
CREATE TABLE webhook_deliveries (
    id              UUID PRIMARY KEY,
    webhook_id      UUID REFERENCES webhooks(id),
    event           VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    status          VARCHAR(20) DEFAULT 'pending',
    response_status INTEGER,
    attempts        INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

# 7. ANALYTICS TABLES

## Post Metrics (ClickHouse)

```sql
CREATE TABLE post_metrics (
    publication_id  String,
    platform        String,
    impressions     UInt64,
    engagements     UInt64,
    likes           UInt64,
    comments        UInt64,
    shares          UInt64,
    clicks          UInt64,
    collected_at    DateTime
) ENGINE = MergeTree()
ORDER BY (publication_id, platform, collected_at);
```

## Daily Aggregates (ClickHouse)

```sql
CREATE TABLE daily_aggregates (
    workspace_id    String,
    date            Date,
    platform        String,
    total_reach     UInt64,
    total_engagements UInt64,
    posts_published UInt32,
    followers_change Int32
) ENGINE = SummingMergeTree()
ORDER BY (workspace_id, date, platform);
```

---

# 8. INDEXES

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);

-- Organizations
CREATE INDEX idx_org_owner ON organizations(owner_id);

-- Workspaces
CREATE INDEX idx_ws_org ON workspaces(organization_id);

-- Content
CREATE INDEX idx_content_ws ON content(workspace_id);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_campaign ON content(campaign_id);

-- Publications
CREATE INDEX idx_pub_ws ON publications(workspace_id);
CREATE INDEX idx_pub_scheduled ON publications(scheduled_at);
CREATE INDEX idx_pub_status ON publications(status);

-- Campaigns
CREATE INDEX idx_camp_ws ON campaigns(workspace_id);
CREATE INDEX idx_camp_dates ON campaigns(start_date, end_date);
```

---

# 9. MIGRATIONS STRATEGY

```yaml
migrations:
  tool: "Prisma Migrate"
  
  process:
    1. Generate migration from schema changes
    2. Review generated SQL
    3. Test on staging
    4. Apply to production
    
  rollback:
    - Keep rollback scripts
    - Test rollback on staging
    - Point-in-time recovery as backup
```

---

**Следующий файл:** 12-DEVELOPMENT-PLAN.md
