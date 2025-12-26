# TECHNICAL ARCHITECTURE
## Техническая архитектура

**Версия:** 1.0  
**Модуль:** 10-TECH-ARCHITECTURE

---

# 1. ОБЗОР АРХИТЕКТУРЫ

## 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   Web   │  │  Mobile │  │   API   │  │  Bots   │            │
│  │   App   │  │   PWA   │  │ Clients │  │ TG/Slack│            │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │
│       └────────────┴────────────┴────────────┘                  │
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    EDGE / CDN                                ││
│  │              Cloudflare / Vercel Edge                        ││
│  │         Static Assets • Edge Functions • WAF                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    API GATEWAY                               ││
│  │              Auth • Rate Limit • Routing                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    SERVICES                                  ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │  │ Content │ │ Publish │ │Analytics│ │Integrat.│           ││
│  │  │ Service │ │ Service │ │ Service │ │ Service │           ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   MESSAGE QUEUE                              ││
│  │                   Redis / BullMQ                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    DATA LAYER                                ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │  │PostgreSQL│ │  Redis  │ │   S3    │ │ClickHse│           ││
│  │  │ Primary │ │  Cache  │ │  Media  │ │Analytics│           ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           ││
│  └─────────────────────────────────────────────────────────────┘│
│                           │                                      │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 EXTERNAL SERVICES                            ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           ││
│  │  │ Claude  │ │Social   │ │  Stripe │ │ SendGrid│           ││
│  │  │   API   │ │  APIs   │ │ Billing │ │  Email  │           ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Architecture Principles

```yaml
principles:

  scalability:
    - horizontal_scaling
    - stateless_services
    - queue_based_processing
    
  reliability:
    - redundancy
    - circuit_breakers
    - graceful_degradation
    
  security:
    - defense_in_depth
    - least_privilege
    - encryption_everywhere
    
  maintainability:
    - modular_design
    - clear_boundaries
    - comprehensive_logging
```

---

# 2. TECHNOLOGY STACK

## 2.1 Frontend

```yaml
frontend:
  
  framework: "Next.js 14"
  features:
    - app_router
    - server_components
    - streaming_ssr
    
  language: "TypeScript 5"
  
  styling:
    framework: "Tailwind CSS 3"
    components: "shadcn/ui"
    icons: "Lucide Icons"
    
  state_management:
    client: "Zustand"
    server: "React Query (TanStack)"
    
  forms:
    validation: "Zod"
    handling: "React Hook Form"
    
  charts: "Recharts"
  
  testing:
    unit: "Vitest"
    e2e: "Playwright"
    
  build:
    bundler: "Turbopack"
    deployment: "Vercel"
```

## 2.2 Backend

```yaml
backend:

  # API Server
  api:
    runtime: "Node.js 20 LTS"
    framework: "Fastify 4"
    language: "TypeScript 5"
    
  # AI Service (отдельный сервис)
  ai_service:
    runtime: "Python 3.11"
    framework: "FastAPI"
    
  # Common
  orm: "Prisma 5"
  validation: "Zod"
  
  authentication:
    library: "Lucia Auth"
    sessions: "Redis"
    oauth: "Arctic"
    
  background_jobs:
    queue: "BullMQ"
    broker: "Redis"
    
  testing:
    unit: "Vitest"
    integration: "Supertest"
```

## 2.3 Databases

```yaml
databases:

  primary:
    type: "PostgreSQL 15"
    hosting: "Neon / Supabase / AWS RDS"
    features:
      - connection_pooling (PgBouncer)
      - read_replicas
      - point_in_time_recovery
      
  cache:
    type: "Redis 7"
    hosting: "Upstash / AWS ElastiCache"
    use_cases:
      - session_storage
      - rate_limiting
      - job_queues
      - caching
      
  analytics:
    type: "ClickHouse"
    hosting: "ClickHouse Cloud / Self-hosted"
    use_cases:
      - metrics_storage
      - analytics_queries
      - time_series_data
      
  search:
    type: "Meilisearch"
    use_cases:
      - content_search
      - template_search
```

## 2.4 Infrastructure

```yaml
infrastructure:

  cloud: "AWS / Yandex Cloud"
  
  compute:
    containers: "Docker"
    orchestration: "Kubernetes (EKS)"
    serverless: "AWS Lambda (for webhooks)"
    
  storage:
    files: "AWS S3 / Yandex Object Storage"
    cdn: "CloudFront / Cloudflare"
    
  networking:
    dns: "Cloudflare"
    ssl: "Let's Encrypt (auto)"
    
  ci_cd:
    platform: "GitHub Actions"
    registry: "GitHub Container Registry"
    
  monitoring:
    metrics: "Prometheus + Grafana"
    logs: "Loki / CloudWatch"
    errors: "Sentry"
    uptime: "Better Uptime"
    
  secrets:
    manager: "AWS Secrets Manager"
```

---

# 3. SERVICE ARCHITECTURE

## 3.1 Services Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICES                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API GATEWAY                            │   │
│  │  • Authentication & Authorization                         │   │
│  │  • Rate Limiting                                          │   │
│  │  • Request Routing                                        │   │
│  │  • API Versioning                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│       ┌──────────────────────┼──────────────────────┐           │
│       ▼                      ▼                      ▼           │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐   │
│  │   CONTENT   │       │  PUBLISH    │       │  ANALYTICS  │   │
│  │   SERVICE   │       │  SERVICE    │       │   SERVICE   │   │
│  │             │       │             │       │             │   │
│  │ • CRUD      │       │ • Queue     │       │ • Metrics   │   │
│  │ • AI Gen    │       │ • Schedule  │       │ • Reports   │   │
│  │ • Templates │       │ • Publish   │       │ • Insights  │   │
│  │ • Brand     │       │ • Retry     │       │ • Export    │   │
│  └─────────────┘       └─────────────┘       └─────────────┘   │
│                              │                                   │
│       ┌──────────────────────┼──────────────────────┐           │
│       ▼                      ▼                      ▼           │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐   │
│  │ INTEGRATION │       │   WORKSPACE │       │ NOTIFICATION│   │
│  │   SERVICE   │       │   SERVICE   │       │   SERVICE   │   │
│  │             │       │             │       │             │   │
│  │ • Webhooks  │       │ • Orgs      │       │ • Email     │   │
│  │ • API Keys  │       │ • Workspaces│       │ • Push      │   │
│  │ • Triggers  │       │ • Teams     │       │ • In-app    │   │
│  │ • External  │       │ • Billing   │       │ • Telegram  │   │
│  └─────────────┘       └─────────────┘       └─────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Service Communication

```yaml
communication:

  sync:
    protocol: "HTTP/REST"
    format: "JSON"
    timeout: "30s default"
    
  async:
    broker: "Redis (BullMQ)"
    patterns:
      - job_queues
      - pub_sub
      
  internal:
    discovery: "Kubernetes DNS"
    load_balancing: "Round-robin"
```

## 3.3 Content Service

```yaml
content_service:
  
  responsibilities:
    - content_crud
    - ai_generation
    - template_management
    - brand_voice
    - media_handling
    
  dependencies:
    - postgresql (storage)
    - redis (cache)
    - s3 (media)
    - claude_api (ai)
    
  endpoints:
    - POST /content
    - GET /content/:id
    - PATCH /content/:id
    - DELETE /content/:id
    - POST /content/generate
    - GET /templates
    - POST /templates
    
  scaling:
    replicas: "2-10 (auto)"
    cpu_trigger: "70%"
```

## 3.4 Publish Service

```yaml
publish_service:
  
  responsibilities:
    - scheduling
    - queue_management
    - publishing_to_platforms
    - retry_handling
    - status_tracking
    
  dependencies:
    - postgresql (storage)
    - redis (queue, locks)
    - social_apis (publishing)
    
  workers:
    - scheduler_worker (cron-based)
    - publisher_worker (queue-based)
    - retry_worker (failed jobs)
    
  queues:
    - publish_queue (main)
    - retry_queue (failed)
    - priority_queue (critical)
    
  scaling:
    workers: "3-20 (based on queue depth)"
```

## 3.5 Analytics Service

```yaml
analytics_service:
  
  responsibilities:
    - metrics_collection
    - data_aggregation
    - report_generation
    - insight_detection
    
  dependencies:
    - clickhouse (analytics storage)
    - postgresql (metadata)
    - redis (cache)
    
  jobs:
    - metrics_sync (hourly)
    - daily_aggregation (daily)
    - insight_generation (daily)
    - report_generation (on-demand)
    
  scaling:
    replicas: "2-5"
```

---

# 4. DATA FLOW

## 4.1 Content Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONTENT CREATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User                                                            │
│    │                                                             │
│    ▼                                                             │
│  ┌─────────────┐                                                │
│  │   Web App   │                                                │
│  └──────┬──────┘                                                │
│         │ POST /api/content                                      │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │ API Gateway │                                                │
│  └──────┬──────┘                                                │
│         │ Validate, Auth                                         │
│         ▼                                                        │
│  ┌─────────────┐      ┌─────────────┐                          │
│  │   Content   │─────▶│  Claude AI  │ (if AI generation)       │
│  │   Service   │◀─────│    API      │                          │
│  └──────┬──────┘      └─────────────┘                          │
│         │                                                        │
│         ├─────────────────────────────────┐                     │
│         ▼                                 ▼                     │
│  ┌─────────────┐                   ┌─────────────┐             │
│  │ PostgreSQL  │                   │     S3      │ (media)     │
│  │  (content)  │                   │   (files)   │             │
│  └─────────────┘                   └─────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Publishing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PUBLISHING FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Scheduled Time Reached                                          │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  Scheduler  │ (checks every minute)                          │
│  │   Worker    │                                                │
│  └──────┬──────┘                                                │
│         │ Add to queue                                           │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │   BullMQ    │                                                │
│  │   Queue     │                                                │
│  └──────┬──────┘                                                │
│         │ Process job                                            │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  Publisher  │                                                │
│  │   Worker    │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│    ┌────┴────┬────────┬────────┬────────┐                      │
│    ▼         ▼        ▼        ▼        ▼                      │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│ │Twitter│ │Discord│ │Telegram│ │  VK  │ │  IG  │                │
│ │  API │ │  API │ │  API │ │ API  │ │ API  │                  │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                  │
│    │         │        │        │        │                      │
│    └────┬────┴────────┴────────┴────────┘                      │
│         │ Results                                                │
│         ▼                                                        │
│  ┌─────────────┐      ┌─────────────┐                          │
│  │ PostgreSQL  │      │  Webhooks   │ (notify external)        │
│  │  (status)   │      │   (send)    │                          │
│  └─────────────┘      └─────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4.3 Analytics Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ANALYTICS FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                │
│  │  Scheduled  │ (hourly / daily)                               │
│  │    Sync     │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│    ┌────┴────┬────────┬────────┐                                │
│    ▼         ▼        ▼        ▼                                │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                            │
│ │Twitter│ │Discord│ │Telegram│ │  VK  │ Fetch metrics          │
│ │  API │ │  API │ │  API │ │ API  │                            │
│ └──────┘ └──────┘ └──────┘ └──────┘                            │
│    │         │        │        │                                │
│    └────┬────┴────────┴────────┘                                │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  Analytics  │                                                │
│  │   Service   │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│         ├─────────────────────────┐                             │
│         ▼                         ▼                             │
│  ┌─────────────┐          ┌─────────────┐                      │
│  │ ClickHouse  │          │    Redis    │ (cache for dashboard)│
│  │  (storage)  │          │   (cache)   │                      │
│  └─────────────┘          └─────────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 5. SECURITY

## 5.1 Security Layers

```yaml
security:

  edge:
    - cloudflare_waf
    - ddos_protection
    - bot_detection
    - geo_blocking (optional)
    
  transport:
    - tls_1.3
    - hsts
    - certificate_pinning (mobile)
    
  application:
    - input_validation (Zod)
    - output_encoding
    - csrf_protection
    - xss_prevention
    - sql_injection_prevention (Prisma)
    
  authentication:
    - secure_session_management
    - password_hashing (Argon2)
    - mfa_support (TOTP)
    - oauth_security
    
  authorization:
    - rbac (role-based)
    - resource_ownership_check
    - api_key_scopes
    
  data:
    - encryption_at_rest (AES-256)
    - encryption_in_transit (TLS)
    - pii_handling
    - data_retention_policies
```

## 5.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Email/Password Login:                                           │
│                                                                  │
│  Client                                                          │
│    │ POST /auth/login {email, password}                         │
│    ▼                                                             │
│  Server                                                          │
│    │ 1. Validate credentials                                     │
│    │ 2. Verify password (Argon2)                                │
│    │ 3. Create session                                          │
│    │ 4. Store in Redis                                          │
│    │ 5. Set secure cookie                                       │
│    ▼                                                             │
│  Client                                                          │
│    │ Receives: Set-Cookie: session=xxx; HttpOnly; Secure        │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  OAuth Login (Google):                                           │
│                                                                  │
│  Client → /auth/google → Google OAuth → Callback                │
│    │                                                             │
│    │ 1. Redirect to Google                                       │
│    │ 2. User authorizes                                         │
│    │ 3. Callback with code                                      │
│    │ 4. Exchange for tokens                                     │
│    │ 5. Create/update user                                      │
│    │ 6. Create session                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 5.3 API Key Security

```yaml
api_keys:
  
  generation:
    format: "sk_{env}_{random32}"
    example: "sk_live_abc123xyz789..."
    
  storage:
    method: "bcrypt hash"
    salt_rounds: 12
    
  display:
    show_once: true
    prefix_only: "sk_live_abc1..."
    
  validation:
    rate_limit: "per key"
    ip_whitelist: "optional"
    expiration: "optional"
    
  rotation:
    supported: true
    grace_period: "24 hours"
```

---

# 6. SCALING

## 6.1 Horizontal Scaling

```yaml
scaling:

  web_app:
    type: "auto-scaling"
    min: 2
    max: 10
    metric: "cpu > 70%"
    
  api_servers:
    type: "auto-scaling"
    min: 2
    max: 20
    metric: "requests_per_second"
    
  workers:
    type: "queue-based"
    min: 3
    max: 50
    metric: "queue_depth > 1000"
    
  database:
    read_replicas: 2
    connection_pool: 100
```

## 6.2 Caching Strategy

```yaml
caching:

  levels:
    cdn:
      - static_assets: "1 year"
      - api_responses: "selective"
      
    application:
      - session_data: "Redis, TTL 24h"
      - user_data: "Redis, TTL 5m"
      - analytics_dashboard: "Redis, TTL 1m"
      - templates: "Redis, TTL 1h"
      
    database:
      - query_cache: "PostgreSQL"
      - connection_pool: "PgBouncer"
      
  invalidation:
    strategy: "cache-aside"
    triggers:
      - data_update
      - ttl_expiration
```

## 6.3 Performance Targets

```yaml
performance:

  latency:
    api_p50: "< 100ms"
    api_p95: "< 300ms"
    api_p99: "< 500ms"
    page_load: "< 2s"
    
  throughput:
    api_rps: "1000+"
    concurrent_users: "10000+"
    
  availability:
    uptime: "99.9%"
    recovery_time: "< 5 minutes"
    
  publishing:
    queue_processing: "< 30s"
    retry_delay: "< 5 minutes"
```

---

# 7. DEPLOYMENT

## 7.1 Environment Strategy

```yaml
environments:

  development:
    purpose: "Local development"
    database: "Local PostgreSQL / Docker"
    services: "Docker Compose"
    
  staging:
    purpose: "Testing before production"
    database: "Separate instance"
    data: "Anonymized production copy"
    deployment: "Same as production"
    
  production:
    purpose: "Live system"
    regions: ["eu-west-1"]
    ha: true
    backup: "Daily, 30-day retention"
```

## 7.2 CI/CD Pipeline

```yaml
pipeline:

  on_push:
    - lint
    - type_check
    - unit_tests
    - build
    
  on_pr:
    - all_above
    - integration_tests
    - preview_deployment
    
  on_merge_main:
    - all_above
    - e2e_tests
    - deploy_staging
    - smoke_tests
    
  on_release:
    - deploy_production
    - health_check
    - notify_team
```

## 7.3 Infrastructure as Code

```yaml
iac:

  tool: "Terraform"
  
  modules:
    - networking (VPC, subnets)
    - compute (EKS, EC2)
    - database (RDS, ElastiCache)
    - storage (S3)
    - monitoring (CloudWatch)
    
  state:
    backend: "S3 + DynamoDB"
    encryption: true
```

---

# 8. MONITORING

## 8.1 Observability Stack

```yaml
observability:

  metrics:
    collector: "Prometheus"
    visualization: "Grafana"
    retention: "30 days"
    
  logs:
    collector: "Loki / CloudWatch"
    format: "JSON structured"
    retention: "90 days"
    
  traces:
    collector: "OpenTelemetry"
    backend: "Jaeger"
    sampling: "10%"
    
  errors:
    tracker: "Sentry"
    alerts: "Slack, PagerDuty"
```

## 8.2 Key Metrics

```yaml
metrics:

  business:
    - active_users
    - posts_published
    - api_calls
    - ai_generations
    
  technical:
    - request_latency
    - error_rate
    - queue_depth
    - cpu_usage
    - memory_usage
    
  external:
    - social_api_latency
    - social_api_errors
    - claude_api_latency
```

## 8.3 Alerting

```yaml
alerts:

  critical:
    - service_down
    - database_connection_failed
    - error_rate > 5%
    channels: [pagerduty, slack]
    
  warning:
    - latency_p95 > 500ms
    - queue_depth > 5000
    - cpu > 80%
    channels: [slack]
    
  info:
    - deployment_completed
    - daily_summary
    channels: [slack]
```

---

**Следующий файл:** 11-DATA-MODEL.md
