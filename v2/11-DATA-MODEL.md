# DATA MODEL
## Модель данных NEXUS

**Версия:** 2.0
**Модуль:** 11-DATA-MODEL

---

# 1. ER DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEXUS DATA MODEL                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                                              │
│   │   PRODUCTS   │                                              │
│   │              │                                              │
│   │ • id         │                                              │
│   │ • name       │                                              │
│   │ • brand_voice│                                              │
│   └──────┬───────┘                                              │
│          │                                                       │
│          │ 1:N                                                  │
│          │                                                       │
│   ┌──────┴───────┐        ┌──────────────┐                     │
│   │   CHANNELS   │        │  AUTOMATIONS │                     │
│   │              │        │              │                     │
│   │ • platform   │        │ • trigger    │                     │
│   │ • credentials│        │ • conditions │                     │
│   └──────────────┘        │ • actions    │                     │
│                           └──────────────┘                     │
│                                                                  │
│   ┌──────────────┐        ┌──────────────┐                     │
│   │   CONTENT    │───────►│ PUBLICATIONS │                     │
│   │              │  1:N   │              │                     │
│   │ • text       │        │ • status     │                     │
│   │ • type       │        │ • platform   │                     │
│   │ • ai_gen     │        │ • scheduled  │                     │
│   └──────────────┘        │ • metrics    │                     │
│          │                └──────────────┘                     │
│          │ N:1                                                  │
│          │                                                       │
│   ┌──────┴───────┐        ┌──────────────┐                     │
│   │  TEMPLATES   │        │   EVENTS     │                     │
│   │              │        │              │                     │
│   │ • structure  │        │ • type       │                     │
│   │ • variables  │        │ • data       │                     │
│   └──────────────┘        │ • processed  │                     │
│                           └──────────────┘                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. CORE TABLES

## 2.1 Products (Твои продукты)

```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT,

    -- Brand Voice Configuration
    brand_voice     JSONB NOT NULL DEFAULT '{
        "personality": [],
        "vocabulary": {"preferred": [], "avoid": []},
        "tone_examples": {},
        "emoji_set": []
    }',

    -- Webhook settings
    webhook_secret  VARCHAR(255),

    -- Settings
    settings        JSONB DEFAULT '{}',

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Example brand_voice JSONB:
-- {
--   "personality": ["mysterious", "philosophical"],
--   "vocabulary": {
--     "preferred": ["soul", "consciousness"],
--     "avoid": ["moon", "lambo"]
--   },
--   "tone_examples": {
--     "announcement": "A new consciousness stirs...",
--     "celebration": "The collective grows..."
--   },
--   "emoji_set": ["🌟", "✨", "🔮"]
-- }
```

## 2.2 Channels (Подключённые платформы)

```sql
CREATE TABLE channels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,

    -- Platform info
    platform        VARCHAR(50) NOT NULL,  -- twitter, telegram, discord, etc.
    platform_name   VARCHAR(255),          -- @handle or channel name

    -- Credentials (encrypted)
    credentials     JSONB NOT NULL,        -- Encrypted tokens

    -- Platform-specific settings
    settings        JSONB DEFAULT '{}',

    -- Status
    status          VARCHAR(20) DEFAULT 'active',  -- active, error, disconnected
    last_used_at    TIMESTAMP,
    error_message   TEXT,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(product_id, platform)
);
```

## 2.3 Content (Контент)

```sql
CREATE TABLE content (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,

    -- Content
    original_text   TEXT NOT NULL,

    -- Adapted versions for different platforms
    adapted         JSONB DEFAULT '{}',
    -- {
    --   "twitter": { "text": "...", "thread": [...] },
    --   "telegram": { "text": "...", "formatting": "markdown" },
    --   "discord": { "text": "...", "embed": {...} }
    -- }

    -- Metadata
    content_type    VARCHAR(50),           -- announcement, spotlight, thread, etc.
    template_id     UUID REFERENCES templates(id),

    -- Media
    media           JSONB DEFAULT '[]',
    -- [{ "type": "image", "url": "...", "alt": "..." }]

    -- AI metadata
    ai_generated    BOOLEAN DEFAULT FALSE,
    ai_prompt       TEXT,
    ai_model        VARCHAR(100),

    -- Predictions
    predictions     JSONB DEFAULT '{}',
    -- { "twitter": { "engagement": 4.2, "confidence": "high" } }

    -- Status
    status          VARCHAR(20) DEFAULT 'draft',  -- draft, ready, published, archived

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_product ON content(product_id);
CREATE INDEX idx_content_status ON content(status);
CREATE INDEX idx_content_type ON content(content_type);
```

## 2.4 Publications (Публикации)

```sql
CREATE TABLE publications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id      UUID REFERENCES content(id) ON DELETE CASCADE,
    channel_id      UUID REFERENCES channels(id) ON DELETE CASCADE,

    -- Scheduling
    status          VARCHAR(20) DEFAULT 'scheduled',
    -- scheduled, publishing, published, failed, cancelled
    scheduled_at    TIMESTAMP NOT NULL,
    published_at    TIMESTAMP,

    -- Platform result
    platform_post_id VARCHAR(255),
    platform_url    VARCHAR(512),

    -- For threads
    thread_ids      JSONB,  -- ["id1", "id2", ...]

    -- Error handling
    error_code      VARCHAR(100),
    error_message   TEXT,
    retry_count     INTEGER DEFAULT 0,

    -- Metrics (updated periodically)
    metrics         JSONB DEFAULT '{}',
    -- {
    --   "impressions": 1000,
    --   "engagements": 50,
    --   "likes": 30,
    --   "comments": 10,
    --   "shares": 10,
    --   "clicks": 20,
    --   "engagement_rate": 5.0,
    --   "collected_at": "2025-01-15T14:00:00Z"
    -- }

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pub_content ON publications(content_id);
CREATE INDEX idx_pub_channel ON publications(channel_id);
CREATE INDEX idx_pub_status ON publications(status);
CREATE INDEX idx_pub_scheduled ON publications(scheduled_at);
```

---

# 3. AUTOMATION TABLES

## 3.1 Automations (Автоматизации)

```sql
CREATE TABLE automations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,

    -- Basic info
    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    -- Trigger configuration
    trigger_type    VARCHAR(50) NOT NULL,  -- event, schedule, metric
    trigger_config  JSONB NOT NULL,
    -- Event: { "event": "mint", "source": "webhook" }
    -- Schedule: { "cron": "0 10 * * 1", "timezone": "UTC+3" }
    -- Metric: { "metric": "engagement", "condition": "> 2x average" }

    -- Conditions (optional)
    conditions      JSONB DEFAULT '[]',
    -- [{ "field": "rarity_score", "operator": ">=", "value": 95 }]

    -- Actions
    actions         JSONB NOT NULL,
    -- [{
    --   "type": "generate",
    --   "template": "spotlight",
    --   "platforms": ["twitter", "discord"],
    --   "scheduling": "optimal"
    -- }]

    -- Status
    enabled         BOOLEAN DEFAULT TRUE,
    last_triggered  TIMESTAMP,
    trigger_count   INTEGER DEFAULT 0,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auto_product ON automations(product_id);
CREATE INDEX idx_auto_enabled ON automations(enabled);
```

## 3.2 Events (Входящие события)

```sql
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,

    -- Event data
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,

    -- Processing
    processed       BOOLEAN DEFAULT FALSE,
    processed_at    TIMESTAMP,
    automations_triggered JSONB DEFAULT '[]',  -- [automation_ids]

    -- Result
    result          JSONB,
    -- { "posts_created": 1, "notifications": 1 }

    -- Timestamps
    received_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_product ON events(product_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_processed ON events(processed);
CREATE INDEX idx_events_received ON events(received_at);
```

## 3.3 Automation Logs

```sql
CREATE TABLE automation_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id   UUID REFERENCES automations(id) ON DELETE CASCADE,
    event_id        UUID REFERENCES events(id) ON DELETE SET NULL,

    -- Execution info
    status          VARCHAR(20) NOT NULL,  -- success, failed, skipped
    started_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP,

    -- Details
    actions_executed JSONB,
    -- [{ "action": "generate", "result": "success", "content_id": "..." }]

    error_message   TEXT,

    -- Context
    trigger_data    JSONB  -- Snapshot of trigger data
);

CREATE INDEX idx_autolog_automation ON automation_logs(automation_id);
CREATE INDEX idx_autolog_status ON automation_logs(status);
```

---

# 4. TEMPLATE TABLES

## 4.1 Templates

```sql
CREATE TABLE templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
    -- NULL product_id = global template

    -- Basic info
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),  -- announcement, spotlight, milestone, etc.

    -- Template configuration
    content_type    VARCHAR(50) NOT NULL,
    platforms       VARCHAR(50)[] DEFAULT '{}',

    -- Structure
    structure       JSONB NOT NULL,
    -- {
    --   "variables": ["title", "key_facts", "cta"],
    --   "format": "single",  // or "thread"
    --   "ai_hints": "Make it exciting and use emojis",
    --   "examples": [...]
    -- }

    -- Flags
    is_system       BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_templates_product ON templates(product_id);
CREATE INDEX idx_templates_category ON templates(category);
```

---

# 5. ANALYTICS TABLES

## 5.1 Daily Aggregates

```sql
CREATE TABLE daily_stats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
    channel_id      UUID REFERENCES channels(id) ON DELETE CASCADE,

    -- Date
    date            DATE NOT NULL,

    -- Metrics
    posts_count     INTEGER DEFAULT 0,
    total_reach     BIGINT DEFAULT 0,
    total_engagements BIGINT DEFAULT 0,
    total_likes     BIGINT DEFAULT 0,
    total_comments  BIGINT DEFAULT 0,
    total_shares    BIGINT DEFAULT 0,
    total_clicks    BIGINT DEFAULT 0,

    -- Calculated
    avg_engagement_rate DECIMAL(5,2),

    -- Follower changes
    followers_start INTEGER,
    followers_end   INTEGER,
    followers_change INTEGER,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),

    UNIQUE(product_id, channel_id, date)
);

CREATE INDEX idx_daily_product ON daily_stats(product_id);
CREATE INDEX idx_daily_date ON daily_stats(date);
```

## 5.2 AI Usage

```sql
CREATE TABLE ai_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Request info
    request_type    VARCHAR(50) NOT NULL,  -- generate, adapt, predict, etc.
    model           VARCHAR(100) NOT NULL,
    product_id      UUID REFERENCES products(id),

    -- Usage
    input_tokens    INTEGER,
    output_tokens   INTEGER,
    total_tokens    INTEGER,

    -- Cost (estimated)
    cost_usd        DECIMAL(10,6),

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_date ON ai_usage(created_at);
CREATE INDEX idx_ai_usage_type ON ai_usage(request_type);
```

---

# 6. SETTINGS & CONFIG

## 6.1 Settings

```sql
CREATE TABLE settings (
    key             VARCHAR(255) PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Предустановленные настройки
INSERT INTO settings (key, value) VALUES
('general', '{
  "timezone": "UTC+3",
  "language": "ru",
  "notifications": {
    "telegram_chat_id": null,
    "email": null
  }
}'),
('publishing', '{
  "default_scheduling": "optimal",
  "min_gap_hours": 2,
  "max_posts_per_day": 30
}'),
('ai', '{
  "default_model": "claude-3-5-sonnet",
  "fallback_model": "claude-3-haiku",
  "temperature": 0.7
}');
```

## 6.2 Queue (BullMQ backed by Redis)

```typescript
// Структура задач в очереди

interface PublishJob {
  type: 'publish';
  publicationId: string;
  priority: 'high' | 'normal' | 'low';
  attempts: number;
}

interface SchedulerJob {
  type: 'check_scheduled';
  timestamp: number;
}

interface AnalyticsJob {
  type: 'sync_metrics';
  publicationId: string;
}

interface AutomationJob {
  type: 'process_event';
  eventId: string;
}
```

---

# 7. PRISMA SCHEMA

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id           String   @id @default(uuid())
  name         String
  slug         String   @unique
  description  String?
  brandVoice   Json     @default("{}")
  webhookSecret String?
  settings     Json     @default("{}")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  channels     Channel[]
  content      Content[]
  automations  Automation[]
  events       Event[]
  templates    Template[]
  dailyStats   DailyStat[]
}

model Channel {
  id            String   @id @default(uuid())
  productId     String
  platform      String
  platformName  String?
  credentials   Json
  settings      Json     @default("{}")
  status        String   @default("active")
  lastUsedAt    DateTime?
  errorMessage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  publications  Publication[]
  dailyStats    DailyStat[]

  @@unique([productId, platform])
}

model Content {
  id            String   @id @default(uuid())
  productId     String
  originalText  String
  adapted       Json     @default("{}")
  contentType   String?
  templateId    String?
  media         Json     @default("[]")
  aiGenerated   Boolean  @default(false)
  aiPrompt      String?
  aiModel       String?
  predictions   Json     @default("{}")
  status        String   @default("draft")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  product       Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  template      Template? @relation(fields: [templateId], references: [id])
  publications  Publication[]
}

model Publication {
  id              String   @id @default(uuid())
  contentId       String
  channelId       String
  status          String   @default("scheduled")
  scheduledAt     DateTime
  publishedAt     DateTime?
  platformPostId  String?
  platformUrl     String?
  threadIds       Json?
  errorCode       String?
  errorMessage    String?
  retryCount      Int      @default(0)
  metrics         Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  content         Content  @relation(fields: [contentId], references: [id], onDelete: Cascade)
  channel         Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([status])
  @@index([scheduledAt])
}

model Automation {
  id              String   @id @default(uuid())
  productId       String
  name            String
  description     String?
  triggerType     String
  triggerConfig   Json
  conditions      Json     @default("[]")
  actions         Json
  enabled         Boolean  @default(true)
  lastTriggered   DateTime?
  triggerCount    Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  product         Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  logs            AutomationLog[]
}

model Event {
  id                    String   @id @default(uuid())
  productId             String
  eventType             String
  payload               Json
  processed             Boolean  @default(false)
  processedAt           DateTime?
  automationsTriggered  Json     @default("[]")
  result                Json?
  receivedAt            DateTime @default(now())

  product               Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  automationLogs        AutomationLog[]
}

model AutomationLog {
  id               String   @id @default(uuid())
  automationId     String
  eventId          String?
  status           String
  startedAt        DateTime @default(now())
  completedAt      DateTime?
  actionsExecuted  Json?
  errorMessage     String?
  triggerData      Json?

  automation       Automation @relation(fields: [automationId], references: [id], onDelete: Cascade)
  event            Event?     @relation(fields: [eventId], references: [id], onDelete: SetNull)
}

model Template {
  id           String   @id @default(uuid())
  productId    String?
  name         String
  description  String?
  category     String?
  contentType  String
  platforms    String[] @default([])
  structure    Json
  isSystem     Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  product      Product? @relation(fields: [productId], references: [id], onDelete: Cascade)
  content      Content[]
}

model DailyStat {
  id                 String   @id @default(uuid())
  productId          String
  channelId          String
  date               DateTime @db.Date
  postsCount         Int      @default(0)
  totalReach         BigInt   @default(0)
  totalEngagements   BigInt   @default(0)
  totalLikes         BigInt   @default(0)
  totalComments      BigInt   @default(0)
  totalShares        BigInt   @default(0)
  totalClicks        BigInt   @default(0)
  avgEngagementRate  Decimal? @db.Decimal(5, 2)
  followersStart     Int?
  followersEnd       Int?
  followersChange    Int?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  product            Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  channel            Channel  @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([productId, channelId, date])
}

model Setting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}

model AiUsage {
  id           String   @id @default(uuid())
  requestType  String
  model        String
  productId    String?
  inputTokens  Int?
  outputTokens Int?
  totalTokens  Int?
  costUsd      Decimal? @db.Decimal(10, 6)
  createdAt    DateTime @default(now())
}
```

---

# 8. МИГРАЦИИ

```bash
# Инициализация
npx prisma migrate dev --name init

# Создание новой миграции
npx prisma migrate dev --name add_feature

# Применение в production
npx prisma migrate deploy

# Сброс (dev only)
npx prisma migrate reset
```

---

**Следующий документ:** 12-ROADMAP.md
