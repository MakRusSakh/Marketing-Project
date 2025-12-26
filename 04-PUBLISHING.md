# PUBLISHING ENGINE
## Детализация модуля публикации

**Версия:** 1.0  
**Модуль:** 04-PUBLISHING

---

# 1. ОБЗОР МОДУЛЯ

## Назначение

Publishing Engine — модуль доставки контента в социальные сети: планирование, очередь, публикация, retry и мониторинг статусов.

## Ключевые компоненты

```
INTAKE → SCHEDULER → QUEUE → WORKERS → PLATFORMS → TRACKER
```

---

# 2. SCHEDULING

## Режимы

| Режим | Описание | Use Case |
|-------|----------|----------|
| **Now** | Немедленная публикация | Срочные новости |
| **Scheduled** | Точное время | Запланированный контент |
| **Optimal** | AI выбирает время | Максимальный охват |
| **Queue** | Следующий слот | Регулярный контент |

## Optimal Time Algorithm

```yaml
factors:
  historical_performance: 35%    # Данные workspace
  platform_benchmarks: 25%       # Общие данные платформы  
  audience_timezone: 20%         # География аудитории
  competition_gap: 10%           # Когда конкуренты молчат
  content_type_fit: 10%          # Лучшее время для типа

output:
  recommended_slot: datetime
  confidence: high/medium/low
  explanation: "Why this time"
  alternatives: [slot1, slot2]
```

---

# 3. QUEUE MANAGEMENT

## Приоритеты

| Priority | Поведение |
|----------|-----------|
| **Critical** | Обходит очередь, публикуется немедленно |
| **High** | Приоритет при конфликтах |
| **Normal** | Стандартный |
| **Low** | Может быть отложен |

## Статусы контента

```
DRAFT → PENDING_APPROVAL → SCHEDULED → PUBLISHING → PUBLISHED
                                            ↓
                                         FAILED → RETRYING → PUBLISHED
                                                     ↓
                                              PERMANENT_FAILURE
```

## Правила очереди

```yaml
slot_rules:
  min_gap: 30           # минут между постами в канал
  max_per_hour: 3       # постов на платформу
  blackout_hours: []    # настраиваемые часы без постов
```

---

# 4. PLATFORM CONNECTORS

## Поддерживаемые платформы MVP+

| Платформа | API | Auth | Особенности |
|-----------|-----|------|-------------|
| **Twitter** | v2 | OAuth 2.0 | 280 chars, threads, polls |
| **Discord** | Bot | Token | Embeds, 2000 chars |
| **Telegram** | Bot | Token | 4096 chars, markdown |
| **VK** | VK API | OAuth | 15K chars, targeting |
| **Instagram** | Graph | Facebook OAuth | Images, carousels |
| **Facebook** | Graph | OAuth | Pages, scheduling |
| **LinkedIn** | Marketing | OAuth | 3000 chars, articles |

## Лимиты платформ

| Платформа | Текст | Изображения | Посты/день |
|-----------|-------|-------------|------------|
| Twitter | 280 | 4 | 2400 |
| Discord | 2000 | 10 | ∞ |
| Telegram | 4096 | 10 | ∞ |
| VK | 15895 | 10 | 50 |
| Instagram | 2200 | 10 | 25 |
| Facebook | 63206 | 10 | 25 |
| LinkedIn | 3000 | 9 | 100 |

---

# 5. APPROVAL WORKFLOW

## Настройки

```yaml
approval:
  enabled: true/false
  require_for:
    - all_posts
    - ai_generated_only
    - specific_platforms: [instagram]
    - by_role: [creator]
  auto_approve_for: [admin, owner]
  approvers: [manager, admin, owner]
```

## Уведомления

- Pending → Email + In-app
- Approved → Creator notified
- Rejected → Creator + reason

---

# 6. ERROR HANDLING

## Типы ошибок

| Тип | Auto-Retry | Действие |
|-----|------------|----------|
| Rate limit | ✅ | Exponential backoff |
| Auth expired | ❌ | Reconnect required |
| Content policy | ❌ | Edit content |
| Media error | ✅ | Retry upload |
| Network | ✅ | Simple retry |
| Unknown | ✅ | 2 retries |

## Retry Strategy

```yaml
exponential_backoff:
  delays: [1min, 2min, 4min, 8min, 16min]
  max_delay: 1 hour
  max_retries: 5

simple_retry:
  delay: 30 seconds
  max_retries: 3
```

---

# 7. WEBHOOKS (OUTBOUND)

## События

| Event | Когда |
|-------|-------|
| `publication.scheduled` | Контент запланирован |
| `publication.completed` | Успешно опубликовано |
| `publication.failed` | Ошибка (будет retry) |
| `publication.permanent_failure` | Все retry исчерпаны |

## Payload

```json
{
  "event": "publication.completed",
  "timestamp": "2025-01-25T14:00:05Z",
  "workspace_id": "ws_abc123",
  "data": {
    "publication_id": "pub_xyz789",
    "platform": "twitter",
    "url": "https://twitter.com/.../status/123",
    "published_at": "2025-01-25T14:00:03Z"
  }
}
```

---

# 8. API ENDPOINTS

```yaml
# Queue
GET    /api/queue                    # List queue
PATCH  /api/queue/:id                # Update (reschedule, cancel)
POST   /api/queue/:id/retry          # Manual retry

# Publishing
POST   /api/publish                  # Publish now
POST   /api/schedule                 # Schedule
GET    /api/publish/optimal-time     # AI recommendation

# Approvals
GET    /api/approvals                # List pending
POST   /api/approvals/:id/approve    # Approve
POST   /api/approvals/:id/reject     # Reject

# Platforms
GET    /api/platforms                # List connected
POST   /api/platforms/:type/connect  # Start OAuth
POST   /api/platforms/:id/test       # Test connection
```

---

# 9. DATA MODELS

```typescript
interface Publication {
  id: string;
  workspaceId: string;
  contentId: string;
  
  status: 'draft' | 'pending_approval' | 'scheduled' | 
          'publishing' | 'published' | 'failed';
  priority: 'critical' | 'high' | 'normal' | 'low';
  scheduledAt: Date;
  
  platformPublications: {
    platform: string;
    status: string;
    platformPostId?: string;
    url?: string;
    publishedAt?: Date;
    error?: { code: string; message: string };
    retryCount: number;
  }[];
  
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  
  createdBy: string;
  createdAt: Date;
}

interface PlatformConnection {
  id: string;
  workspaceId: string;
  platform: string;
  
  accessToken: string;  // encrypted
  refreshToken?: string;
  tokenExpiresAt?: Date;
  
  platformUsername?: string;
  channelId?: string;  // Discord/Telegram
  
  status: 'active' | 'expired' | 'error';
  lastUsedAt?: Date;
}
```

---

**Следующий файл:** 05-ANALYTICS.md
