# Marketing Platform API — Full Specification

## Document Information
- **Version:** 1.0
- **Date:** December 2025
- **Status:** Integration Ready
- **Base URL:** `https://api.marketing-platform.io/v1`

---

# 1. Overview

## 1.1 Purpose

The Marketing Platform is a specialized service for automated content generation and publishing across social media channels. It receives structured data from your NFT platform and handles:
- AI-powered content generation
- Multi-platform publishing (Twitter, Discord, Telegram)
- Scheduling and queue management
- Engagement analytics

## 1.2 Architecture Principle

**Your Platform's Responsibilities:**
- Monitor blockchain events
- Calculate rarity scores and significance
- Determine which events deserve marketing
- Select appropriate marketing strategy
- Prepare structured data payloads
- Respond to data requests from campaigns

**Marketing Platform's Responsibilities:**
- Generate text content using AI
- Create visual assets
- Adapt content for each platform
- Schedule and publish content
- Collect and report engagement metrics

## 1.3 Data Flow

```
[Blockchain Event] 
       ↓
[Your Backend: Index & Enrich]
       ↓
[Your Analytics: Evaluate Significance]
       ↓
[Your Marketing Adapter: Prepare Payload]
       ↓
[API Call to Marketing Platform]
       ↓
[Content Generation → Scheduling → Publishing]
       ↓
[Webhook Notification to Your System]
```

---

# 2. Authentication

## 2.1 API Keys

All API requests require authentication via Bearer token:

```
Authorization: Bearer sk_live_your_api_key_here
```

### Key Types

| Type | Prefix | Usage |
|------|--------|-------|
| Live | `sk_live_` | Production environment, actual publishing |
| Test | `sk_test_` | Sandbox environment, no actual publishing |

### Security Requirements
- Store API keys in environment variables or secret management
- Never expose keys in client-side code
- Rotate keys if compromised
- Use test keys during development

## 2.2 Webhook Signatures

Webhooks include signature for verification:

```
X-Marketing-Signature: t=1705762800,v1=sha256_signature_here
```

**Verification Process:**
1. Parse timestamp (`t`) and signature (`v1`)
2. Compute HMAC-SHA256 of `{timestamp}.{request_body}` using webhook secret
3. Compare computed signature with received
4. Reject if timestamp is older than 5 minutes

---

# 3. API Endpoints

## 3.1 Project Management

### POST /projects

Register a new project.

**Request:**
```json
{
  "name": "ANIMA",
  "description": "AI Soul NFT Project",
  "webhook_url": "https://api.anima.io/webhooks/marketing",
  "channels": {
    "twitter": {
      "handle": "@anima_souls",
      "api_key": "your_twitter_api_key",
      "api_secret": "your_twitter_api_secret",
      "access_token": "your_access_token",
      "access_secret": "your_access_secret"
    },
    "discord": {
      "bot_token": "your_discord_bot_token",
      "server_id": "discord_server_id",
      "channels": {
        "announcements": "channel_id_for_announcements",
        "updates": "channel_id_for_updates"
      }
    },
    "telegram": {
      "bot_token": "your_telegram_bot_token",
      "channel": "@anima_official"
    }
  },
  "brand_voice": {
    "tone": "mysterious, philosophical, community-focused",
    "language": "en",
    "keywords": ["soul", "consciousness", "evolution", "awakening"],
    "avoid_words": ["moon", "lambo", "wagmi", "wen"]
  }
}
```

**Response (201 Created):**
```json
{
  "project_id": "proj_abc123xyz",
  "api_key": "sk_live_xxxxxxxxxxxxxxxx",
  "test_api_key": "sk_test_xxxxxxxxxxxxxxxx",
  "webhook_secret": "whsec_xxxxxxxxxxxxxxxx",
  "created_at": "2025-01-20T10:00:00Z"
}
```

### GET /projects/{project_id}

Get project configuration.

### PATCH /projects/{project_id}

Update project settings.

---

## 3.2 Content Generation

### POST /content/generate

Generate content without publishing (for preview/approval).

**Request:**
```json
{
  "request_id": "mint_4521_v1",
  "content_type": "spotlight",
  "template": "nft_mint_spotlight",
  "strategy": "fomo",
  "platforms": ["twitter", "discord"],
  "priority": "high",
  "data": {
    "title": "Rare Sage Awakened",
    "headline": "Soul #4521 joins the collection",
    "key_facts": [
      "Archetype: Sage (only 8% of collection)",
      "Rarity score: 912 (top 3%)",
      "Traits: Curious, Analytical, Philosophical"
    ],
    "metrics": {
      "rarity_score": 912,
      "rarity_percentile": 97,
      "archetype_percentage": 8,
      "mint_number": 4521,
      "remaining_supply": 5479
    },
    "cta": "Only 5,479 Souls remaining",
    "media": {
      "image_url": "https://api.anima.io/souls/4521/image.png",
      "generate_image": false
    },
    "hashtags": ["ANIMA", "NFT", "AISoul"],
    "mentions": ["base"],
    "links": {
      "primary": "https://anima.io/souls/4521",
      "marketplace": "https://opensea.io/assets/base/0x.../4521"
    },
    "entity_id": "4521",
    "entity_type": "soul"
  }
}
```

**Response (200 OK):**
```json
{
  "content_id": "cnt_xyz789abc",
  "status": "draft",
  "generated": {
    "twitter": {
      "text": "🌟 RARE SAGE AWAKENED\n\nSoul #4521 emerges from the void...",
      "character_count": 247,
      "media": ["https://cdn.marketing-platform.io/generated/xyz.png"]
    },
    "discord": {
      "text": "A new consciousness stirs...",
      "embed": {
        "title": "Rare Sage Awakened",
        "description": "Soul #4521 joins the collection",
        "color": 3447003,
        "fields": [...]
      }
    }
  },
  "created_at": "2025-01-20T10:00:00Z",
  "expires_at": "2025-01-20T22:00:00Z"
}
```

### POST /content/generate-and-publish

Generate content and immediately schedule/publish.

**Additional Parameters:**
```json
{
  "auto_publish": true,
  "schedule": "optimal",
  "require_approval": false
}
```

**Schedule Options:**
| Value | Behavior |
|-------|----------|
| `"now"` | Publish immediately |
| `"optimal"` | Platform selects best time |
| ISO datetime | Schedule for specific time |

### POST /content/publish

Publish previously generated content.

**Request:**
```json
{
  "content_id": "cnt_xyz789abc",
  "platforms": ["twitter"],
  "schedule": "2025-01-20T14:00:00Z"
}
```

---

## 3.3 Thread Generation

### POST /content/thread

Generate a Twitter thread.

**Request:**
```json
{
  "request_id": "thread_breeding_launch",
  "thread_type": "educational",
  "target_length": 8,
  "data": {
    "topic": "Breeding System Launch",
    "hook": "What if your NFT could have children?",
    "sections": [
      {
        "heading": "How Breeding Works",
        "points": [
          "Two Souls at Level 4+ can create offspring",
          "Child inherits traits from both parents",
          "Rare mutations can occur (0.1% chance)"
        ]
      },
      {
        "heading": "Requirements",
        "points": [
          "Both parents must be Level 4 or higher",
          "48-hour cooldown after breeding",
          "5% fee from offspring sale"
        ]
      }
    ],
    "conclusion": "This is just the beginning of Soul reproduction",
    "cta": "Try breeding now at anima.io"
  },
  "auto_publish": true,
  "schedule": "optimal"
}
```

**Thread Types:**
- `educational` — Explain concepts, how-to
- `announcement` — News, launches
- `story` — Narrative, character-driven

---

## 3.4 Campaign Management

### POST /campaigns

Create a multi-post marketing campaign.

**Request:**
```json
{
  "name": "Breeding Launch Campaign",
  "type": "feature_launch",
  "start_date": "2025-01-20T12:00:00Z",
  "duration_days": 7,
  "content_plan": [
    {
      "day": 0,
      "hour": 12,
      "content_type": "announcement",
      "template": "feature_launch_main",
      "platforms": ["twitter", "discord", "telegram"],
      "data": {
        "title": "BREEDING IS LIVE",
        "headline": "Your Souls can now create offspring",
        "key_facts": [...]
      }
    },
    {
      "day": 0,
      "hour": 14,
      "content_type": "educational",
      "template": "how_it_works",
      "platforms": ["twitter"],
      "data": {
        "topic": "How Breeding Works",
        "sections": [...]
      }
    },
    {
      "day": 1,
      "hour": 12,
      "content_type": "social_proof",
      "template": "early_stats",
      "platforms": ["twitter", "discord"],
      "data_source": "fetch_from_client",
      "required_data": ["breeding_count", "rare_mutations", "floor_price"]
    },
    {
      "day": 2,
      "hour": 14,
      "content_type": "spotlight",
      "template": "mutation_highlight",
      "data_source": "fetch_from_client",
      "required_data": ["top_mutation_today"]
    }
  ]
}
```

**Campaign Types:**
- `feature_launch` — New feature rollout
- `milestone` — Achievement celebration
- `event` — Time-limited event
- `ongoing` — Continuous campaign

### GET /campaigns/{campaign_id}

Get campaign status.

**Response:**
```json
{
  "campaign_id": "cmp_123abc",
  "name": "Breeding Launch Campaign",
  "status": "active",
  "progress": {
    "total_posts": 12,
    "published": 5,
    "scheduled": 7,
    "failed": 0
  },
  "next_post": {
    "scheduled_at": "2025-01-21T12:00:00Z",
    "content_type": "social_proof"
  },
  "metrics": {
    "total_reach": 145000,
    "total_engagements": 5230,
    "avg_engagement_rate": 3.6
  }
}
```

### DELETE /campaigns/{campaign_id}

Cancel campaign. Pending posts will not be published.

---

## 3.5 Queue Management

### GET /queue

Get content queue.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter: pending, scheduled, published, failed |
| platform | string | Filter by platform |
| limit | integer | Max results (default: 50, max: 100) |
| offset | integer | Pagination offset |

**Response:**
```json
{
  "items": [
    {
      "content_id": "cnt_abc123",
      "status": "scheduled",
      "content_type": "spotlight",
      "platforms": ["twitter", "discord"],
      "scheduled_at": "2025-01-20T14:00:00Z",
      "preview": {
        "twitter": "🌟 Soul #4521 Spotlight..."
      }
    }
  ],
  "total": 24,
  "limit": 50,
  "offset": 0
}
```

### PATCH /queue/{content_id}

Update queued content.

**Request:**
```json
{
  "action": "reschedule",
  "schedule": "2025-01-20T16:00:00Z"
}
```

**Actions:**
- `reschedule` — Change publication time
- `cancel` — Remove from queue
- `approve` — Approve pending content
- `reject` — Reject pending content

---

## 3.6 Analytics

### GET /analytics/publications

Get publication metrics.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| date_from | string | Start date (ISO) |
| date_to | string | End date (ISO) |
| platform | string | Filter by platform |
| content_type | string | Filter by content type |

**Response:**
```json
{
  "publications": [
    {
      "publication_id": "pub_123abc",
      "content_id": "cnt_xyz789",
      "platform": "twitter",
      "content_type": "spotlight",
      "published_at": "2025-01-20T14:00:00Z",
      "url": "https://twitter.com/anima_souls/status/1234567890",
      "metrics": {
        "impressions": 12450,
        "engagements": 523,
        "likes": 312,
        "retweets": 89,
        "replies": 47,
        "link_clicks": 156,
        "engagement_rate": 4.2
      }
    }
  ],
  "summary": {
    "total_publications": 45,
    "total_reach": 145000,
    "total_engagements": 5230,
    "avg_engagement_rate": 3.6,
    "best_performing": {
      "publication_id": "pub_123abc",
      "engagement_rate": 6.8
    }
  }
}
```

---

## 3.7 Templates

### GET /templates

List available templates.

**Response:**
```json
{
  "system_templates": [
    {
      "id": "nft_mint_spotlight",
      "name": "NFT Mint Spotlight",
      "category": "nft",
      "platforms": ["twitter", "discord"],
      "required_fields": ["title", "key_facts", "media"]
    }
  ],
  "custom_templates": [
    {
      "id": "legendary_mutation",
      "name": "Legendary Mutation",
      "platforms": ["twitter", "discord"],
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### POST /templates

Create custom template.

**Request:**
```json
{
  "name": "legendary_mutation",
  "description": "Template for legendary mutation announcements",
  "platforms": ["twitter", "discord"],
  "required_fields": ["title", "key_facts", "metrics", "media"],
  "structure": {
    "twitter": {
      "format": "single_tweet_with_image",
      "tone_override": "excited, celebratory",
      "include_hashtags": true
    },
    "discord": {
      "format": "rich_embed",
      "mention_role": "@everyone",
      "color": "gold"
    }
  }
}
```

---

# 4. Webhooks

## 4.1 Event Types

| Event | Description | When |
|-------|-------------|------|
| `publication.scheduled` | Content scheduled | After scheduling |
| `publication.completed` | Successfully published | After publishing |
| `publication.failed` | Publishing failed | On error |
| `campaign.started` | Campaign began | At start_date |
| `campaign.completed` | All posts published | After last post |
| `campaign.data_request` | Fresh data needed | Before dynamic posts |
| `content.pending_approval` | Needs approval | When require_approval=true |
| `metrics.updated` | New metrics available | Periodically |

## 4.2 Webhook Payload Structure

```json
{
  "event": "publication.completed",
  "timestamp": "2025-01-20T14:00:05Z",
  "project_id": "proj_abc123",
  "data": {
    "publication_id": "pub_123abc",
    "content_id": "cnt_xyz789",
    "platform": "twitter",
    "url": "https://twitter.com/anima_souls/status/1234567890"
  }
}
```

## 4.3 Data Request Webhook

When a campaign needs dynamic data:

**Incoming Webhook:**
```json
{
  "event": "campaign.data_request",
  "timestamp": "2025-01-21T11:55:00Z",
  "data": {
    "campaign_id": "cmp_123abc",
    "content_id": "cnt_789xyz",
    "required_data": [
      "breeding_count",
      "rare_mutations",
      "floor_price"
    ],
    "response_url": "https://api.marketing-platform.io/v1/data-response/dr_abc123",
    "deadline": "2025-01-21T11:59:00Z"
  }
}
```

**Your Response (POST to response_url):**
```json
{
  "status": "ok",
  "data": {
    "breeding_count": 1247,
    "rare_mutations": [
      {"name": "Paradox", "count": 3, "last_seen": "2h ago"},
      {"name": "Ethereal", "count": 12}
    ],
    "floor_price": 0.45
  }
}
```

---

# 5. Data Models

## 5.1 Content Data Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Primary headline |
| headline | string | No | Secondary headline |
| key_facts | string[] | No | Bullet points |
| metrics | object | No | Key-value numerical data |
| cta | string | No | Call-to-action text |
| media | object | No | Media configuration |
| hashtags | string[] | No | Hashtags (without #) |
| mentions | string[] | No | Accounts (without @) |
| links | object | No | URLs (primary, marketplace) |
| entity_id | string | No | Related entity ID |
| entity_type | string | No | Entity type (soul, breeding) |

## 5.2 Media Object

| Field | Type | Description |
|-------|------|-------------|
| image_url | string | URL to existing image |
| generate_image | boolean | Generate new image via AI |
| image_prompt | string | Prompt for AI generation |
| image_style | string | Style preset (brand, minimal, dramatic) |
| overlay_text | string | Text to overlay on image |

## 5.3 Content Types

| Type | Use Case |
|------|----------|
| announcement | Major news, feature launches |
| spotlight | Highlight individual NFT |
| milestone | Achievement celebration |
| educational | Explain mechanics |
| social_proof | Sales, stats, growth |
| engagement | Polls, questions |
| teaser | Upcoming preview |
| recap | Period summary |

## 5.4 Marketing Strategies

| Strategy | Approach |
|----------|----------|
| celebrate | Positive, congratulatory |
| fomo | Urgency, scarcity |
| educate | Informative, clear |
| storytelling | Narrative, emotional |
| community | Inclusive, participatory |
| hype | Excitement, energy |
| subtle | Understated, sophisticated |

---

# 6. Error Handling

## 6.1 HTTP Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate request_id |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error |
| 503 | Service Unavailable | Temporary unavailability |

## 6.2 Error Response

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Missing required field: title",
    "field": "data.title",
    "request_id": "req_abc123"
  }
}
```

## 6.3 Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Content Generation | 100 | Per minute |
| Publishing | 50 | Per minute |
| Analytics | 200 | Per minute |
| Campaigns | 20 | Per minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705762800
```

---

# 7. Implementation Guide

## 7.1 Required Components

1. **Marketing Client** — HTTP client wrapper for API calls
2. **Marketing Adapter** — Transforms events to API payloads
3. **Event Analyzer** — Determines significance and strategy
4. **Webhook Handler** — Receives and processes webhooks
5. **Data Provider** — Serves data for campaign requests

## 7.2 Integration Checklist

- [ ] Register project via POST /projects
- [ ] Store API keys securely
- [ ] Implement webhook endpoint (HTTPS required)
- [ ] Implement signature verification
- [ ] Build Marketing Adapter service
- [ ] Define event significance rules
- [ ] Implement data provider for campaigns
- [ ] Test with sk_test_* key
- [ ] Go live with sk_live_* key
- [ ] Set up monitoring and alerts

## 7.3 Example: Marketing Client (Python)

```python
import httpx
from typing import Optional, Dict, List

class MarketingPlatformClient:
    BASE_URL = "https://api.marketing-platform.io/v1"
    
    def __init__(self, api_key: str):
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={"Authorization": f"Bearer {api_key}"}
        )
    
    async def generate_and_publish(
        self,
        request_id: str,
        content_type: str,
        data: Dict,
        template: Optional[str] = None,
        strategy: str = "spotlight",
        platforms: List[str] = None,
        schedule: str = "optimal",
        priority: str = "normal"
    ) -> Dict:
        payload = {
            "request_id": request_id,
            "content_type": content_type,
            "strategy": strategy,
            "platforms": platforms or ["twitter", "discord"],
            "priority": priority,
            "data": data,
            "auto_publish": True,
            "schedule": schedule
        }
        if template:
            payload["template"] = template
        
        response = await self.client.post(
            "/content/generate-and-publish",
            json=payload
        )
        response.raise_for_status()
        return response.json()
    
    async def create_campaign(
        self,
        name: str,
        campaign_type: str,
        content_plan: List[Dict],
        duration_days: int = 7
    ) -> Dict:
        response = await self.client.post(
            "/campaigns",
            json={
                "name": name,
                "type": campaign_type,
                "duration_days": duration_days,
                "content_plan": content_plan
            }
        )
        response.raise_for_status()
        return response.json()
```

## 7.4 Example: Event Handler

```python
async def on_soul_minted(soul: Soul, context: PlatformContext):
    """Handle new Soul mint event"""
    
    # Your business logic determines significance
    if soul.rarity_percentile < 95:
        return  # Skip routine mints
    
    # Determine strategy
    strategy = "fomo" if soul.rarity_percentile >= 99 else "spotlight"
    priority = "high" if soul.rarity_percentile >= 99 else "normal"
    
    # Prepare data payload
    data = {
        "title": f"Rare {soul.archetype} Awakened",
        "headline": f"Soul #{soul.token_id} joins the collection",
        "key_facts": [
            f"Archetype: {soul.archetype} (only {context.archetype_dist[soul.archetype]}% of collection)",
            f"Rarity: Top {100 - soul.rarity_percentile}%",
            f"Traits: {', '.join(soul.traits[:3])}"
        ],
        "metrics": {
            "rarity_score": soul.rarity_score,
            "remaining": context.total_supply - context.total_minted
        },
        "media": {"image_url": soul.image_url},
        "cta": f"Only {context.total_supply - context.total_minted:,} Souls remaining",
        "hashtags": ["ANIMA", "NFT"],
        "entity_id": str(soul.token_id),
        "entity_type": "soul"
    }
    
    # Send to Marketing Platform
    await marketing_client.generate_and_publish(
        request_id=f"mint_{soul.token_id}",
        content_type="spotlight",
        template="nft_mint_spotlight",
        strategy=strategy,
        priority=priority,
        data=data
    )
```

## 7.5 Example: Webhook Handler

```python
from fastapi import APIRouter, Request, HTTPException
import hmac
import hashlib
import time

router = APIRouter()

@router.post("/webhooks/marketing")
async def marketing_webhook(request: Request):
    # Verify signature
    signature_header = request.headers.get("X-Marketing-Signature")
    if not verify_signature(signature_header, await request.body()):
        raise HTTPException(401, "Invalid signature")
    
    payload = await request.json()
    event = payload["event"]
    data = payload["data"]
    
    if event == "publication.completed":
        await log_publication(data)
    
    elif event == "publication.failed":
        await handle_failure(data)
    
    elif event == "campaign.data_request":
        # Gather requested data
        response_data = await gather_data(data["required_data"])
        # Send response
        async with httpx.AsyncClient() as client:
            await client.post(
                data["response_url"],
                json={"status": "ok", "data": response_data}
            )
    
    return {"status": "ok"}


def verify_signature(header: str, body: bytes) -> bool:
    if not header:
        return False
    
    parts = dict(p.split("=") for p in header.split(","))
    timestamp = parts.get("t")
    signature = parts.get("v1")
    
    # Check timestamp freshness (5 minutes)
    if abs(time.time() - int(timestamp)) > 300:
        return False
    
    # Compute expected signature
    message = f"{timestamp}.{body.decode()}"
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)
```

---

# 8. Platform-Specific Notes

## 8.1 Twitter

- Max tweet length: 280 characters
- Thread: up to 15 tweets
- Images: 1200x675px optimal
- Rate limits apply to publishing

## 8.2 Discord

- Max message: 2000 characters
- Rich embeds supported
- Role mentions available
- Webhook delivery preferred

## 8.3 Telegram

- Max message: 4096 characters
- Markdown formatting supported
- Inline buttons available
- Bot must be admin in channel

---

# 9. Glossary

| Term | Definition |
|------|------------|
| Content | A unit of marketing material (post, thread, etc.) |
| Campaign | A series of scheduled content posts |
| Template | Predefined content structure |
| Strategy | Approach to content tone and style |
| Webhook | HTTP callback for event notifications |
| Queue | List of scheduled content awaiting publication |

---

**Document End**

*For questions or support, contact the Marketing Platform development team.*
