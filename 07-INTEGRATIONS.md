# INTEGRATION HUB
## Детализация модуля интеграций

**Версия:** 1.0  
**Модуль:** 07-INTEGRATIONS

---

# 1. ОБЗОР МОДУЛЯ

## Назначение

Integration Hub обеспечивает связь MAP с внешними системами через REST API, Webhooks и готовые интеграции.

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                INTEGRATION HUB                       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  INBOUND (External → MAP)                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │  REST API │  │ Webhooks  │  │    SDK    │       │
│  │  (push)   │  │ (receive) │  │  (native) │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                      │
│  OUTBOUND (MAP → External)                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐       │
│  │ Webhooks  │  │   Data    │  │  Native   │       │
│  │  (send)   │  │  Export   │  │   Apps    │       │
│  └───────────┘  └───────────┘  └───────────┘       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

# 2. REST API

## 2.1 Обзор

```yaml
api:
  base_url: "https://api.map-platform.com/v1"
  format: JSON
  authentication: Bearer Token (API Key)
  rate_limits:
    standard: 100 requests/minute
    burst: 200 requests/minute
  versioning: URL path (/v1/)
```

## 2.2 Аутентификация

```yaml
authentication:
  
  api_keys:
    types:
      - live: "sk_live_..." (production)
      - test: "sk_test_..." (sandbox)
    
    header: "Authorization: Bearer sk_live_xxxxx"
    
  permissions:
    full_access: "All operations"
    read_only: "GET requests only"
    publish_only: "Content creation and publishing"
    analytics_only: "Read analytics data"
    
  security:
    - keys_hashed_in_db
    - last_used_tracking
    - ip_whitelist (optional)
    - key_rotation_support
```

## 2.3 Основные Endpoints

### Content

```yaml
content_endpoints:

  # Create content
  POST /v1/content:
    description: "Create new content"
    body:
      text: string (required)
      platforms: string[] (required)
      media: object[] (optional)
      template_id: string (optional)
      metadata: object (optional)
    response:
      id: string
      status: "draft"
      
  # Generate with AI
  POST /v1/content/generate:
    description: "Generate content with AI"
    body:
      topic: string (required)
      content_type: string
      strategy: string
      platforms: string[]
      variants: number (1-5)
    response:
      variants: ContentVariant[]
      
  # Get content
  GET /v1/content/{id}:
    response:
      id: string
      text: string
      adapted_versions: object
      status: string
      
  # List content
  GET /v1/content:
    query:
      status: string
      platform: string
      limit: number
      offset: number
    response:
      items: Content[]
      total: number
      
  # Update content
  PATCH /v1/content/{id}:
    body:
      text: string
      platforms: string[]
      
  # Delete content
  DELETE /v1/content/{id}:
```

### Publishing

```yaml
publishing_endpoints:

  # Publish immediately
  POST /v1/publish:
    body:
      content_id: string (required)
      platforms: string[] (optional, defaults to content platforms)
    response:
      publication_id: string
      status: "publishing"
      
  # Schedule publication
  POST /v1/schedule:
    body:
      content_id: string (required)
      scheduled_at: datetime (required)
      platforms: string[]
      priority: string
    response:
      publication_id: string
      status: "scheduled"
      scheduled_at: datetime
      
  # Get optimal time
  GET /v1/publish/optimal-time:
    query:
      platform: string (required)
      content_type: string
    response:
      recommended: datetime
      confidence: string
      alternatives: datetime[]
      
  # Cancel scheduled
  DELETE /v1/schedule/{publication_id}:
```

### Queue

```yaml
queue_endpoints:

  # List queue
  GET /v1/queue:
    query:
      status: string
      platform: string
      from_date: date
      to_date: date
    response:
      items: QueueItem[]
      
  # Update queue item
  PATCH /v1/queue/{id}:
    body:
      scheduled_at: datetime
      priority: string
      
  # Retry failed
  POST /v1/queue/{id}/retry:
```

### Analytics

```yaml
analytics_endpoints:

  # Dashboard summary
  GET /v1/analytics/summary:
    query:
      period: string (7d, 30d, 90d)
    response:
      reach: number
      engagements: number
      engagement_rate: number
      growth: number
      
  # Post metrics
  GET /v1/analytics/posts/{publication_id}:
    response:
      impressions: number
      engagements: number
      engagement_rate: number
      breakdown: object
      
  # Platform comparison
  GET /v1/analytics/platforms:
    query:
      period: string
    response:
      platforms: PlatformMetrics[]
```

### Campaigns

```yaml
campaign_endpoints:

  # Create campaign
  POST /v1/campaigns:
    body:
      name: string
      type: string
      start_date: date
      end_date: date
      channels: string[]
      
  # Add content to campaign
  POST /v1/campaigns/{id}/content:
    body:
      content_id: string
      phase: string
      scheduled_at: datetime
      
  # Campaign analytics
  GET /v1/campaigns/{id}/analytics:
```

## 2.4 Response Format

```json
// Success response
{
  "success": true,
  "data": {
    "id": "cnt_abc123",
    "text": "Content text...",
    "status": "draft"
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid platform specified",
    "field": "platforms[0]",
    "request_id": "req_xyz789"
  }
}

// List response
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

## 2.5 Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing API key |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `PLATFORM_ERROR` | 502 | Social platform error |
| `INTERNAL_ERROR` | 500 | Server error |

---

# 3. WEBHOOKS

## 3.1 Outbound Webhooks (MAP → External)

### Supported Events

```yaml
webhook_events:

  content:
    - content.created
    - content.updated
    - content.deleted
    
  publication:
    - publication.scheduled
    - publication.started
    - publication.completed
    - publication.failed
    - publication.cancelled
    
  campaign:
    - campaign.started
    - campaign.completed
    - campaign.paused
    
  analytics:
    - metrics.daily_summary
    - metrics.anomaly_detected
    
  workspace:
    - workspace.member_added
    - workspace.member_removed
```

### Webhook Configuration

```
┌─────────────────────────────────────────────────────┐
│ WEBHOOK SETTINGS                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Endpoint URL:                                       │
│ ┌─────────────────────────────────────────────────┐│
│ │ https://your-server.com/webhooks/map           ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Events to send:                                     │
│ ☑ publication.completed                            │
│ ☑ publication.failed                               │
│ ☐ content.created                                  │
│ ☐ content.updated                                  │
│ ☑ metrics.daily_summary                            │
│ ☐ campaign.completed                               │
│                                                     │
│ Secret Key (for signature verification):            │
│ ┌─────────────────────────────────────────────────┐│
│ │ whsec_xxxxxxxxxxxxxxxxxxxxx         [Regenerate]││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ [Test Webhook]                      [Save Settings]│
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "publication.completed",
  "created_at": "2025-01-25T14:00:05Z",
  "workspace_id": "ws_xyz",
  "data": {
    "publication_id": "pub_123",
    "content_id": "cnt_456",
    "platform": "twitter",
    "platform_post_id": "1234567890",
    "url": "https://twitter.com/.../status/1234567890",
    "published_at": "2025-01-25T14:00:03Z"
  }
}
```

### Signature Verification

```python
import hmac
import hashlib

def verify_webhook(payload: bytes, signature: str, secret: str) -> bool:
    """Verify webhook signature"""
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected}", signature)

# Usage
signature = request.headers.get('X-MAP-Signature')
is_valid = verify_webhook(request.body, signature, webhook_secret)
```

### Retry Policy

```yaml
webhook_retry:
  max_attempts: 5
  backoff: exponential
  delays: [1min, 5min, 30min, 2h, 24h]
  
  success_codes: [200, 201, 202, 204]
  
  on_permanent_failure:
    - disable_webhook
    - notify_admin
```

## 3.2 Inbound Webhooks (External → MAP)

### Event Trigger Endpoint

```yaml
inbound_webhook:
  
  endpoint: POST /v1/webhooks/trigger
  
  authentication:
    - api_key (header)
    - hmac_signature (optional)
    
  purpose: "Trigger content generation/publication based on external events"
  
  use_cases:
    - NFT minted → publish announcement
    - Order placed → thank customer
    - Milestone reached → celebrate
```

### Trigger Configuration

```
┌─────────────────────────────────────────────────────┐
│ EVENT TRIGGER: NFT Mint                             │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Trigger Name: [NFT Mint Announcement              ]│
│                                                     │
│ Webhook URL (your unique endpoint):                 │
│ https://api.map-platform.com/v1/webhooks/trigger/   │
│ wh_abc123xyz                            [Copy URL] │
│                                                     │
│ Expected Payload Fields:                            │
│ ┌─────────────────────────────────────────────────┐│
│ │ {                                               ││
│ │   "event": "nft.minted",                       ││
│ │   "data": {                                    ││
│ │     "token_id": "4521",                        ││
│ │     "name": "Soul #4521",                      ││
│ │     "rarity": "legendary",                     ││
│ │     "image_url": "https://..."                 ││
│ │   }                                            ││
│ │ }                                              ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Template: [mint_spotlight ▼]                        │
│                                                     │
│ Field Mapping:                                      │
│ ┌─────────────────────────────────────────────────┐│
│ │ Template Field    →    Webhook Field            ││
│ │ ─────────────────────────────────────────────── ││
│ │ token_id          →    data.token_id            ││
│ │ name              →    data.name                ││
│ │ rarity_score      →    data.rarity              ││
│ │ image_url         →    data.image_url           ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Action:                                             │
│ (●) Generate and publish immediately               │
│ ( ) Generate and add to queue                      │
│ ( ) Generate as draft (manual review)              │
│                                                     │
│ Platforms: ☑ Twitter  ☑ Discord  ☐ Telegram       │
│                                                     │
│ Conditions (optional):                              │
│ ☐ Only trigger if data.rarity = "legendary"       │
│                                                     │
│                              [Test] [Save Trigger] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 4. SDK

## 4.1 Python SDK

```python
# Installation
# pip install map-platform

from map_platform import MAPClient

# Initialize
client = MAPClient(api_key="sk_live_xxxxx")

# Generate content
variants = client.content.generate(
    topic="New breeding feature launched",
    content_type="announcement",
    strategy="hype",
    platforms=["twitter", "discord"],
    variants=3
)

# Select and publish
content = client.content.create(
    text=variants[0].text,
    platforms=["twitter", "discord"],
    media=[{"url": "https://..."}]
)

# Schedule
publication = client.publish.schedule(
    content_id=content.id,
    scheduled_at="2025-01-25T14:00:00Z"
)

# Or publish now
publication = client.publish.now(content_id=content.id)

# Get analytics
metrics = client.analytics.get_post(publication.id)
print(f"Engagement rate: {metrics.engagement_rate}%")

# Webhooks
@client.webhook_handler("publication.completed")
def on_published(event):
    print(f"Published to {event.data.platform}: {event.data.url}")
```

## 4.2 Node.js SDK

```javascript
// Installation
// npm install @map-platform/sdk

const { MAPClient } = require('@map-platform/sdk');

// Initialize
const client = new MAPClient({ apiKey: 'sk_live_xxxxx' });

// Generate content
const variants = await client.content.generate({
  topic: 'New breeding feature launched',
  contentType: 'announcement',
  strategy: 'hype',
  platforms: ['twitter', 'discord'],
  variants: 3
});

// Create and publish
const content = await client.content.create({
  text: variants[0].text,
  platforms: ['twitter', 'discord']
});

const publication = await client.publish.now({
  contentId: content.id
});

// Webhook verification middleware (Express)
const { verifyWebhook } = require('@map-platform/sdk');

app.post('/webhooks/map', 
  verifyWebhook(process.env.WEBHOOK_SECRET),
  (req, res) => {
    const event = req.body;
    console.log(`Event: ${event.type}`);
    res.sendStatus(200);
  }
);
```

---

# 5. NATIVE INTEGRATIONS

## 5.1 Zapier

```yaml
zapier_integration:

  triggers:
    - publication_completed:
        description: "When a post is published"
        output: [platform, url, content, metrics]
        
    - publication_failed:
        description: "When publication fails"
        output: [platform, error, content]
        
    - daily_metrics:
        description: "Daily analytics summary"
        output: [reach, engagements, growth]
        
  actions:
    - create_content:
        description: "Create new content"
        input: [text, platforms, media_url]
        
    - generate_content:
        description: "Generate with AI"
        input: [topic, content_type, platforms]
        
    - publish_now:
        description: "Publish immediately"
        input: [content_id] or [text, platforms]
        
    - schedule_post:
        description: "Schedule publication"
        input: [content_id, datetime]
        
  searches:
    - find_content:
        description: "Find content by ID or text"
        
    - get_analytics:
        description: "Get post analytics"
```

## 5.2 Интеграции (будущее)

```yaml
planned_integrations:

  e_commerce:
    - shopify:
        triggers: [order_created, product_updated]
        actions: [create_product_post]
    - woocommerce:
        triggers: [order_created]
        
  crm:
    - hubspot:
        sync: [contacts, deals]
        triggers: [deal_closed]
    - bitrix24:
        sync: [contacts, leads]
        
  analytics:
    - google_analytics:
        features: [utm_tracking, goal_import]
    - mixpanel:
        features: [event_tracking]
        
  communication:
    - slack:
        features: [notifications, approvals, commands]
    - telegram_bot:
        features: [notifications, quick_actions]
```

---

# 6. API DOCUMENTATION

## 6.1 Documentation Portal

```yaml
documentation:

  format: OpenAPI 3.0 (Swagger)
  
  sections:
    - getting_started
    - authentication
    - endpoints_reference
    - webhooks
    - sdks
    - examples
    - changelog
    
  features:
    - interactive_playground (try requests)
    - code_examples (curl, python, node, php)
    - response_schemas
    - error_reference
```

## 6.2 Interactive Playground

```
┌─────────────────────────────────────────────────────┐
│ API PLAYGROUND                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Endpoint: [POST /v1/content/generate ▼]            │
│                                                     │
│ Headers:                                            │
│ Authorization: Bearer [sk_test_xxxxx        ]      │
│                                                     │
│ Request Body:                                       │
│ ┌─────────────────────────────────────────────────┐│
│ │ {                                               ││
│ │   "topic": "New feature announcement",         ││
│ │   "content_type": "announcement",              ││
│ │   "platforms": ["twitter"],                    ││
│ │   "variants": 2                                ││
│ │ }                                              ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ [Send Request]                                      │
│                                                     │
│ Response (200 OK):                                  │
│ ┌─────────────────────────────────────────────────┐│
│ │ {                                               ││
│ │   "success": true,                             ││
│ │   "data": {                                    ││
│ │     "variants": [                              ││
│ │       {                                        ││
│ │         "text": "🚀 Exciting news!...",       ││
│ │         "predicted_engagement": 0.045          ││
│ │       },                                       ││
│ │       ...                                      ││
│ │     ]                                          ││
│ │   }                                            ││
│ │ }                                              ││
│ └─────────────────────────────────────────────────┘│
│                                                     │
│ Code Examples: [cURL] [Python] [Node.js] [PHP]     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 7. RATE LIMITS & QUOTAS

## 7.1 Rate Limits

```yaml
rate_limits:

  by_plan:
    starter:
      requests_per_minute: 60
      ai_generations_per_day: 50
      
    growth:
      requests_per_minute: 100
      ai_generations_per_day: 300
      
    pro:
      requests_per_minute: 200
      ai_generations_per_day: 1000
      
    enterprise:
      requests_per_minute: custom
      ai_generations_per_day: unlimited
      
  headers:
    X-RateLimit-Limit: "100"
    X-RateLimit-Remaining: "95"
    X-RateLimit-Reset: "1706187600"
    
  on_limit_exceeded:
    status: 429
    body:
      error:
        code: "RATE_LIMITED"
        message: "Too many requests"
        retry_after: 60
```

## 7.2 Quotas

```yaml
quotas:

  by_resource:
    workspaces:
      starter: 1
      growth: 3
      pro: 10
      enterprise: unlimited
      
    api_keys:
      all_plans: 5 per workspace
      
    webhooks:
      all_plans: 10 per workspace
      
    scheduled_posts:
      starter: 100 active
      growth: 500 active
      pro: unlimited
```

---

# 8. SECURITY

## 8.1 API Security

```yaml
security:

  transport:
    - tls_1.2_minimum
    - tls_1.3_preferred
    
  authentication:
    - api_keys (bearer token)
    - key_hashing (bcrypt)
    - key_rotation_support
    
  authorization:
    - permission_scopes
    - workspace_isolation
    
  additional:
    - ip_whitelist (optional)
    - request_signing (optional)
    - audit_logging
```

## 8.2 Webhook Security

```yaml
webhook_security:

  signature:
    algorithm: HMAC-SHA256
    header: X-MAP-Signature
    format: "sha256={signature}"
    
  recommendations:
    - always_verify_signature
    - use_https_endpoints
    - implement_idempotency
    - validate_event_types
```

---

# 9. DATA MODELS

```typescript
interface APIKey {
  id: string;
  workspaceId: string;
  
  name: string;
  keyHash: string;  // bcrypt hash
  keyPrefix: string;  // "sk_live_xxx..." for display
  
  type: 'live' | 'test';
  permissions: Permission[];
  
  ipWhitelist?: string[];
  
  lastUsedAt?: Date;
  expiresAt?: Date;
  
  createdBy: string;
  createdAt: Date;
}

interface Webhook {
  id: string;
  workspaceId: string;
  
  url: string;
  secret: string;  // encrypted
  
  events: string[];
  
  status: 'active' | 'disabled';
  
  // Stats
  totalDeliveries: number;
  successfulDeliveries: number;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: number;
  
  createdAt: Date;
}

interface WebhookTrigger {
  id: string;
  workspaceId: string;
  
  name: string;
  webhookUrl: string;  // unique per trigger
  
  templateId: string;
  fieldMapping: Record<string, string>;
  
  action: 'publish_now' | 'add_to_queue' | 'create_draft';
  platforms: Platform[];
  
  conditions?: {
    field: string;
    operator: 'eq' | 'neq' | 'contains';
    value: string;
  }[];
  
  // Stats
  triggeredCount: number;
  lastTriggeredAt?: Date;
  
  createdAt: Date;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  
  event: string;
  payload: object;
  
  status: 'pending' | 'delivered' | 'failed';
  responseStatus?: number;
  responseBody?: string;
  
  attempts: number;
  nextRetryAt?: Date;
  
  createdAt: Date;
  deliveredAt?: Date;
}
```

---

**Следующий файл:** 08-WORKSPACES.md
