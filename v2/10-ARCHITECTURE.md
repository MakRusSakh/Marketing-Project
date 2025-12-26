# TECHNICAL ARCHITECTURE
## Техническая архитектура NEXUS

**Версия:** 2.0
**Модуль:** 10-ARCHITECTURE

---

# 1. ПРИНЦИПЫ АРХИТЕКТУРЫ

## 1.1 Ключевые решения

```yaml
architecture_decisions:

  simplicity_first:
    decision: "Монолит вместо микросервисов"
    rationale: "Один пользователь, быстрая разработка, проще деплой"
    trade_off: "Масштабирование через вертикальное scaling"

  modern_stack:
    decision: "Next.js full-stack"
    rationale: "Frontend + API в одном, отличный DX, Vercel деплой"

  ai_as_core:
    decision: "Claude API как основной движок"
    rationale: "Лучшее качество генерации, русский язык"
    fallback: "Локальный кэш промптов"

  local_first:
    decision: "Возможность работы без облака"
    rationale: "Независимость, приватность"
    implementation: "Docker-compose для self-hosted"
```

## 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEXUS ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        ┌─────────────┐                          │
│                        │   CLIENT    │                          │
│                        │   (You)     │                          │
│                        └──────┬──────┘                          │
│                               │                                  │
│           ┌───────────────────┼───────────────────┐             │
│           │                   │                   │             │
│           ▼                   ▼                   ▼             │
│    ┌────────────┐     ┌────────────┐     ┌────────────┐        │
│    │   WEB UI   │     │    CLI     │     │  TG BOT    │        │
│    │  (Next.js) │     │  (Node)    │     │  (Node)    │        │
│    └─────┬──────┘     └─────┬──────┘     └─────┬──────┘        │
│          │                  │                  │                │
│          └──────────────────┼──────────────────┘                │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     NEXUS CORE                            │  │
│  │                    (Next.js App)                          │  │
│  │                                                           │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│  │  │ API Routes  │ │  Services   │ │   Workers   │        │  │
│  │  │             │ │             │ │             │        │  │
│  │  │ • Content   │ │ • AI Engine │ │ • Publisher │        │  │
│  │  │ • Publish   │ │ • Scheduler │ │ • Scheduler │        │  │
│  │  │ • Analytics │ │ • Publisher │ │ • Analytics │        │  │
│  │  │ • Webhooks  │ │ • Analytics │ │ • Webhooks  │        │  │
│  │  │ • Products  │ │ • Automator │ │             │        │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘        │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                    │
│          ┌──────────────────┼──────────────────┐                │
│          │                  │                  │                │
│          ▼                  ▼                  ▼                │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐           │
│   │ PostgreSQL │    │   Redis    │    │     S3     │           │
│   │  (Data)    │    │  (Queue)   │    │  (Media)   │           │
│   └────────────┘    └────────────┘    └────────────┘           │
│                                                                  │
│                             │                                    │
│          ┌──────────────────┼──────────────────┐                │
│          │                  │                  │                │
│          ▼                  ▼                  ▼                │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐           │
│   │ Claude API │    │ Social APIs│    │Your Products│           │
│   │   (AI)     │    │ (Publish)  │    │ (Webhooks) │           │
│   └────────────┘    └────────────┘    └────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. TECHNOLOGY STACK

## 2.1 Core Stack

```yaml
frontend:
  framework: "Next.js 14"
  language: "TypeScript"
  styling: "Tailwind CSS"
  components: "shadcn/ui"
  state: "Zustand"
  data_fetching: "TanStack Query"
  forms: "React Hook Form + Zod"

backend:
  runtime: "Node.js 20"
  framework: "Next.js API Routes"
  orm: "Prisma"
  validation: "Zod"
  queue: "BullMQ"

database:
  primary: "PostgreSQL 15"
  cache: "Redis 7"
  media: "S3-compatible (R2/MinIO)"

ai:
  primary: "Claude API (Anthropic)"
  model: "claude-3-5-sonnet"
  fallback: "claude-3-haiku"

deployment:
  primary: "Vercel"
  alternative: "Docker + VPS"
  self_hosted: "Docker Compose"
```

## 2.2 External Services

```yaml
social_platforms:
  twitter:
    api: "Twitter API v2"
    auth: "OAuth 2.0"

  telegram:
    api: "Telegram Bot API"
    auth: "Bot Token"

  discord:
    api: "Discord API"
    auth: "Bot Token"

  vk:
    api: "VK API"
    auth: "Access Token"

  instagram:
    api: "Instagram Graph API"
    auth: "Facebook OAuth"

  linkedin:
    api: "LinkedIn API"
    auth: "OAuth 2.0"

monitoring:
  errors: "Sentry"
  analytics: "Plausible (self-hosted) / Vercel Analytics"
  uptime: "Better Uptime (free tier)"
```

---

# 3. COMPONENT DETAILS

## 3.1 Web Application

```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/          # Main app routes
│   │   ├── page.tsx          # Dashboard
│   │   ├── content/          # Content management
│   │   ├── queue/            # Publishing queue
│   │   ├── analytics/        # Analytics
│   │   ├── automations/      # Automations
│   │   ├── products/         # Products management
│   │   └── settings/         # Settings
│   │
│   ├── api/                  # API Routes
│   │   ├── content/          # Content CRUD
│   │   ├── publish/          # Publishing
│   │   ├── ai/               # AI endpoints
│   │   ├── webhooks/         # Incoming webhooks
│   │   ├── events/           # Product events
│   │   └── analytics/        # Analytics data
│   │
│   └── auth/                 # Auth (if needed)
│
├── components/               # React components
│   ├── ui/                   # Base UI (shadcn)
│   ├── dashboard/            # Dashboard widgets
│   ├── content/              # Content components
│   ├── editor/               # Content editor
│   └── common/               # Shared components
│
├── lib/                      # Core libraries
│   ├── ai/                   # AI engine
│   ├── publishers/           # Platform publishers
│   ├── automation/           # Automation engine
│   ├── analytics/            # Analytics engine
│   └── utils/                # Utilities
│
├── services/                 # Business logic
│   ├── content.ts
│   ├── publishing.ts
│   ├── automation.ts
│   └── analytics.ts
│
└── workers/                  # Background workers
    ├── publisher.ts          # Publishing worker
    ├── scheduler.ts          # Scheduling worker
    ├── analytics.ts          # Metrics sync
    └── automation.ts         # Automation processor
```

## 3.2 AI Engine

```typescript
// lib/ai/engine.ts

interface AIEngine {
  // Content Generation
  generate(input: GenerateInput): Promise<GeneratedContent>;
  generateThread(input: ThreadInput): Promise<ThreadContent>;
  generateBatch(input: BatchInput): Promise<BatchContent>;

  // Adaptation
  adaptToPlatform(content: string, platform: Platform): Promise<string>;
  multiplyContent(content: string, formats: Format[]): Promise<MultiContent>;

  // Optimization
  improveContent(content: string, goals: Goal[]): Promise<ImprovedContent>;
  generateHeadlines(content: string, count: number): Promise<Headline[]>;

  // Intelligence
  predictEngagement(content: string, platform: Platform): Promise<Prediction>;
  suggestContent(product: Product): Promise<Suggestion[]>;
  detectTrends(product: Product): Promise<Trend[]>;
}

// Implementation
class NexusAIEngine implements AIEngine {
  private client: Anthropic;
  private cache: Redis;

  async generate(input: GenerateInput): Promise<GeneratedContent> {
    // 1. Load product brand voice
    const voice = await this.loadBrandVoice(input.product);

    // 2. Build context from history
    const context = await this.buildContext(input.product);

    // 3. Generate with Claude
    const response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      system: this.buildSystemPrompt(voice, context),
      messages: [{ role: "user", content: this.buildUserPrompt(input) }]
    });

    // 4. Adapt for each platform
    const adapted = await this.adaptForPlatforms(
      response.content,
      input.platforms
    );

    // 5. Predict engagement
    const predictions = await this.predictEngagement(adapted);

    return { content: adapted, predictions };
  }
}
```

## 3.3 Automation Engine

```typescript
// lib/automation/engine.ts

interface AutomationEngine {
  // Event handling
  handleEvent(event: Event): Promise<void>;

  // Workflow execution
  executeWorkflow(workflow: Workflow): Promise<ExecutionResult>;

  // Scheduling
  scheduleRecurring(schedule: Schedule): Promise<void>;

  // Management
  pauseAutomation(id: string): Promise<void>;
  resumeAutomation(id: string): Promise<void>;
}

class NexusAutomationEngine implements AutomationEngine {
  private queue: Queue;
  private ai: AIEngine;
  private publisher: Publisher;

  async handleEvent(event: Event): Promise<void> {
    // 1. Find matching automations
    const automations = await this.findMatchingAutomations(event);

    // 2. Evaluate conditions
    const triggered = automations.filter(a =>
      this.evaluateConditions(a.conditions, event.data)
    );

    // 3. Execute actions
    for (const automation of triggered) {
      await this.executeActions(automation.actions, event.data);
    }

    // 4. Log execution
    await this.logExecution(event, triggered);
  }

  async executeActions(actions: Action[], data: any): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'generate':
          const content = await this.ai.generate({
            template: action.template,
            data,
            product: action.product
          });
          await this.queueForPublishing(content, action);
          break;

        case 'notify':
          await this.sendNotification(action.channel, action.message, data);
          break;

        case 'publish':
          await this.publisher.publish(action.content, action.platforms);
          break;
      }
    }
  }
}
```

## 3.4 Publisher

```typescript
// lib/publishers/manager.ts

interface PublisherManager {
  publish(content: Content, platforms: Platform[]): Promise<PublishResult[]>;
  schedule(content: Content, time: Date, platforms: Platform[]): Promise<void>;
  getStatus(publishId: string): Promise<PublishStatus>;
}

// lib/publishers/twitter.ts
class TwitterPublisher implements PlatformPublisher {
  async publish(content: Content): Promise<PublishResult> {
    if (content.type === 'thread') {
      return this.publishThread(content);
    }
    return this.publishTweet(content);
  }

  private async publishThread(content: ThreadContent): Promise<PublishResult> {
    let lastTweetId: string | null = null;

    for (const tweet of content.tweets) {
      const result = await this.client.v2.tweet({
        text: tweet.text,
        reply: lastTweetId ? { in_reply_to_tweet_id: lastTweetId } : undefined,
        media: tweet.media ? { media_ids: [tweet.media] } : undefined
      });
      lastTweetId = result.data.id;
    }

    return { success: true, url: `https://twitter.com/i/status/${lastTweetId}` };
  }
}
```

---

# 4. DATA FLOW

## 4.1 Content Generation Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│   User     │────►│  Generate  │────►│   Review   │
│   Input    │     │   (AI)     │     │  (Preview) │
└────────────┘     └────────────┘     └─────┬──────┘
                                            │
                         ┌──────────────────┴──────────────────┐
                         │                                      │
                         ▼                                      ▼
                  ┌────────────┐                        ┌────────────┐
                  │  Schedule  │                        │  Publish   │
                  │   (Queue)  │                        │   (Now)    │
                  └─────┬──────┘                        └─────┬──────┘
                        │                                      │
                        ▼                                      ▼
                  ┌────────────┐                        ┌────────────┐
                  │  Worker    │                        │  Platforms │
                  │ (at time)  │───────────────────────►│            │
                  └────────────┘                        └────────────┘
```

## 4.2 Automation Flow

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Product   │────►│  Webhook   │────►│ Automation │
│  Event     │     │  Receiver  │     │  Engine    │
└────────────┘     └────────────┘     └─────┬──────┘
                                            │
                   ┌────────────────────────┼────────────────────────┐
                   │                        │                        │
                   ▼                        ▼                        ▼
            ┌────────────┐          ┌────────────┐          ┌────────────┐
            │  Evaluate  │          │  Generate  │          │   Notify   │
            │ Conditions │          │  Content   │          │   Owner    │
            └─────┬──────┘          └─────┬──────┘          └────────────┘
                  │                       │
                  │ (if match)            │
                  ▼                       ▼
            ┌────────────┐          ┌────────────┐
            │  Execute   │          │  Schedule  │
            │  Actions   │────────► │  or Post   │
            └────────────┘          └────────────┘
```

---

# 5. DEPLOYMENT

## 5.1 Vercel (Primary)

```yaml
vercel_deployment:

  configuration:
    framework: "Next.js"
    build_command: "npm run build"
    output_directory: ".next"

  environment:
    DATABASE_URL: "postgres://..."
    REDIS_URL: "redis://..."
    ANTHROPIC_API_KEY: "sk-..."
    # Social platform tokens
    TWITTER_API_KEY: "..."
    TELEGRAM_BOT_TOKEN: "..."
    DISCORD_BOT_TOKEN: "..."

  features:
    - "Automatic deployments"
    - "Preview deployments"
    - "Edge functions"
    - "Cron jobs (for workers)"

  cron_jobs:
    - path: "/api/cron/publisher"
      schedule: "* * * * *"  # Every minute

    - path: "/api/cron/scheduler"
      schedule: "*/5 * * * *"  # Every 5 minutes

    - path: "/api/cron/analytics"
      schedule: "0 * * * *"  # Every hour
```

## 5.2 Self-Hosted (Docker)

```yaml
# docker-compose.yml

version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:password@db:5432/nexus
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  worker:
    build: .
    command: npm run worker
    environment:
      DATABASE_URL: postgres://postgres:password@db:5432/nexus
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: nexus
      POSTGRES_PASSWORD: password

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

# 6. SECURITY

## 6.1 Security Measures

```yaml
security:

  authentication:
    method: "Simple password or OAuth"
    sessions: "HTTP-only cookies"
    note: "Single user, no complex auth needed"

  api_security:
    webhooks:
      - "HMAC signature verification"
      - "Timestamp validation (5 min window)"
    rate_limiting:
      - "100 req/min for webhooks"

  data_protection:
    tokens:
      - "Encrypted at rest (AES-256)"
      - "Never logged"
    database:
      - "Encrypted connections"
    backups:
      - "Encrypted"
      - "Daily automated"

  platform_tokens:
    storage: "Encrypted in database"
    rotation: "Manual (with alerts for expiry)"
```

## 6.2 Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgres://user:pass@host:5432/nexus

# Redis
REDIS_URL=redis://host:6379

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Social Platforms
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

TELEGRAM_BOT_TOKEN=...

DISCORD_BOT_TOKEN=...

VK_ACCESS_TOKEN=...

INSTAGRAM_ACCESS_TOKEN=...

LINKEDIN_ACCESS_TOKEN=...

# Storage
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=...

# App
APP_SECRET=...  # For sessions
WEBHOOK_SECRET=...  # For verifying incoming webhooks
```

---

# 7. MONITORING

## 7.1 Application Monitoring

```yaml
monitoring:

  error_tracking:
    service: "Sentry"
    config:
      - "Capture exceptions"
      - "Performance monitoring"
      - "Release tracking"

  logging:
    local: "Console + File"
    production: "Structured JSON"
    retention: "30 days"

  health_checks:
    endpoints:
      - "/api/health"
      - "/api/health/db"
      - "/api/health/redis"
      - "/api/health/ai"

  alerts:
    channels:
      - "Telegram bot"
      - "Email (optional)"

    conditions:
      - "Error rate > 5%"
      - "Response time > 5s"
      - "Worker queue backlog > 100"
      - "Publishing failures > 3"
```

## 7.2 Business Metrics

```yaml
business_metrics:

  dashboard:
    - "Posts published today/week/month"
    - "AI generation usage"
    - "Automation triggers"
    - "Platform performance"

  alerts:
    - "No posts in 24h"
    - "Engagement drop > 50%"
    - "Automation failures"
```

---

# 8. SCALING

## 8.1 Current Scale (Single User)

```yaml
expected_scale:

  content:
    posts_per_day: "10-50"
    ai_requests_per_day: "50-200"

  publishing:
    publications_per_day: "50-200"
    platforms: "5-7"

  storage:
    media_per_month: "1-5 GB"
    database: "< 1 GB"

  compute:
    vercel: "Hobby/Pro plan sufficient"
    self_hosted: "2 CPU, 4 GB RAM"
```

## 8.2 Future Scaling (If Needed)

```yaml
scaling_options:

  vertical:
    - "Increase VPS resources"
    - "Upgrade Vercel plan"

  horizontal:
    - "Separate workers"
    - "Read replicas for DB"
    - "CDN for media"

  optimization:
    - "AI response caching"
    - "Batch publishing"
    - "Async processing"
```

---

**Следующий документ:** 11-DATA-MODEL.md
