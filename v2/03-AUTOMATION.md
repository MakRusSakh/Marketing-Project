# AUTOMATION ENGINE
## Автоматизация маркетинга

**Версия:** 2.0
**Модуль:** 03-AUTOMATION

---

# 1. ОБЗОР АВТОМАТИЗАЦИИ

## 1.1 Философия

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   "Маркетинг должен работать, даже когда ты спишь"             │
│                                                                  │
│   NEXUS Automation:                                              │
│   • Реагирует на события в реальном времени                     │
│   • Выполняет рутинные задачи автоматически                     │
│   • Масштабирует твоё присутствие без масштабирования усилий   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 1.2 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTOMATION ENGINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGERS                        ACTIONS                        │
│  ────────                        ───────                        │
│                                                                  │
│  ┌─────────────┐                ┌─────────────┐                │
│  │   EVENTS    │                │  GENERATE   │                │
│  │ • Webhooks  │                │ • AI Create │                │
│  │ • Metrics   │                │ • Template  │                │
│  │ • Time      │───► LOGIC ───►│ • Transform │                │
│  │ • External  │     ENGINE    │             │                │
│  └─────────────┘                └─────────────┘                │
│                                        │                        │
│                                        ▼                        │
│                                 ┌─────────────┐                │
│                                 │   PUBLISH   │                │
│                                 │ • Schedule  │                │
│                                 │ • Queue     │                │
│                                 │ • Immediate │                │
│                                 └─────────────┘                │
│                                        │                        │
│                                        ▼                        │
│                                 ┌─────────────┐                │
│                                 │   NOTIFY    │                │
│                                 │ • Telegram  │                │
│                                 │ • Email     │                │
│                                 │ • Webhook   │                │
│                                 └─────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. ТИПЫ ТРИГГЕРОВ

## 2.1 Event Triggers (от твоих продуктов)

```yaml
event_triggers:

  # ═══════════════════════════════════════════
  # NFT / Web3 ПРОЕКТ
  # ═══════════════════════════════════════════

  nft_mint:
    webhook: "POST /events/nft/mint"
    payload:
      token_id: 4521
      rarity: "legendary"
      rarity_score: 98
      archetype: "Sage"
      owner: "0x..."

    rules:
      - condition: "rarity_score >= 95"
        action: "spotlight_post"
        priority: "high"
        delay: "5m"

      - condition: "rarity_score >= 80"
        action: "mention_post"
        priority: "normal"
        delay: "random(1h-4h)"

      - condition: "is_milestone(token_id, [100, 500, 1000, 5000])"
        action: "milestone_celebration"
        priority: "high"

  nft_sale:
    webhook: "POST /events/nft/sale"
    payload:
      token_id: 4521
      price_eth: 2.5
      from: "0x..."
      to: "0x..."

    rules:
      - condition: "price_eth >= 1.0"
        action: "big_sale_post"
        delay: "random(30m-2h)"

      - condition: "is_new_ath(price_eth)"
        action: "ath_celebration"
        priority: "high"

  # ═══════════════════════════════════════════
  # SAAS ПРОДУКТ
  # ═══════════════════════════════════════════

  saas_signup:
    webhook: "POST /events/saas/signup"
    payload:
      user_id: "u_123"
      plan: "premium"
      source: "product_hunt"

    rules:
      - condition: "plan == 'enterprise'"
        action: "enterprise_welcome_internal"
        notify: true

      - condition: "milestone(total_users, [100, 500, 1000, 5000, 10000])"
        action: "user_milestone_post"
        platforms: ["twitter", "linkedin"]

  saas_feature_used:
    webhook: "POST /events/saas/feature"
    payload:
      feature: "ai_assistant"
      usage_count: 1000

    rules:
      - condition: "milestone(usage_count, [1000, 10000, 100000])"
        action: "feature_milestone_post"

  # ═══════════════════════════════════════════
  # E-COMMERCE
  # ═══════════════════════════════════════════

  ecom_order:
    webhook: "POST /events/ecom/order"
    payload:
      order_id: "ord_456"
      total: 150
      items: 3
      customer_orders_count: 1

    rules:
      - condition: "total >= 500"
        action: "big_order_celebration"
        delay: "random(1h-4h)"

      - condition: "customer_orders_count == 1 && daily_orders >= 50"
        action: "daily_orders_milestone"

  ecom_review:
    webhook: "POST /events/ecom/review"
    payload:
      rating: 5
      review_text: "Amazing product..."
      product_id: "prod_789"

    rules:
      - condition: "rating == 5 && len(review_text) > 100"
        action: "share_review_post"
        platforms: ["instagram", "twitter"]
        delay: "random(2h-8h)"
```

## 2.2 Metric Triggers

```yaml
metric_triggers:

  engagement_spike:
    monitor: "engagement_rate"
    condition: "current > average * 2"
    window: "1h"
    action:
      type: "amplify"
      actions:
        - "repost_to_other_platforms"
        - "notify_owner"
        - "save_as_template"

  engagement_drop:
    monitor: "engagement_rate"
    condition: "current < average * 0.5"
    window: "3d"
    action:
      type: "alert"
      message: "Engagement упал за последние 3 дня"
      suggestions:
        - "Изменить тип контента"
        - "Проверить время публикации"
        - "Добавить больше визуала"

  follower_milestone:
    monitor: "followers"
    condition: "crosses_milestone([1000, 5000, 10000, 50000, 100000])"
    action:
      type: "celebrate"
      template: "follower_milestone"
      auto_publish: true

  viral_content:
    monitor: "single_post_reach"
    condition: "reach > average_reach * 10"
    action:
      type: "capitalize"
      actions:
        - "notify_immediately"
        - "suggest_follow_up_content"
        - "cross_post_if_not_done"
```

## 2.3 Schedule Triggers

```yaml
schedule_triggers:

  recurring_content:

    weekly_recap:
      schedule: "every monday 10:00"
      action:
        type: "generate_and_post"
        template: "weekly_recap"
        data_source: "last_7_days_metrics"
        platforms: ["twitter", "telegram"]
        review_required: false

    daily_tip:
      schedule: "weekdays 14:00"
      action:
        type: "post_from_queue"
        content_type: "tips"
        fallback: "generate_new"

    friday_engagement:
      schedule: "friday 16:00"
      action:
        type: "generate_and_post"
        template: "weekend_engagement"
        style: "question"
        platforms: ["twitter"]

  maintenance:

    queue_check:
      schedule: "daily 09:00"
      action:
        type: "check_and_alert"
        condition: "scheduled_today < 2"
        alert: "Мало контента запланировано на сегодня"

    analytics_digest:
      schedule: "weekly monday 09:00"
      action:
        type: "generate_report"
        send_to: "telegram"

    content_suggestions:
      schedule: "daily 10:00"
      action:
        type: "ai_suggestions"
        based_on: "gaps_and_opportunities"
        notify: true
```

## 2.4 External Triggers

```yaml
external_triggers:

  competitor_activity:
    source: "competitor_monitor"
    events:
      major_announcement:
        action: "notify_and_suggest"
        urgency: "high"

      viral_post:
        action: "analyze_and_learn"

  trending_topic:
    source: "trend_detector"
    events:
      relevant_trend:
        condition: "relevance_score > 0.7"
        action: "suggest_content"
        auto_generate: true
        auto_publish: false

  news_mention:
    source: "news_monitor"
    keywords: ["product_name", "brand_name"]
    action: "notify_immediately"
```

---

# 3. ACTION TYPES

## 3.1 Generate Actions

```yaml
generate_actions:

  spotlight_post:
    description: "Создать пост-spotlight для события"
    process:
      1. "Получить данные из payload"
      2. "Загрузить product brand voice"
      3. "Сгенерировать контент через AI"
      4. "Адаптировать под платформы"
      5. "Добавить в очередь"

    config:
      template: "spotlight"
      platforms: ["twitter", "discord"]
      scheduling: "optimal"
      media: "fetch_from_product"

  milestone_celebration:
    description: "Праздничный пост о milestone"
    process:
      1. "Определить тип milestone"
      2. "Подготовить данные (числа, рост)"
      3. "Сгенерировать celebration контент"
      4. "Опубликовать на всех платформах"

    config:
      template: "milestone"
      platforms: "all"
      scheduling: "immediate"
      priority: "high"

  weekly_recap:
    description: "Еженедельный обзор"
    process:
      1. "Собрать метрики за неделю"
      2. "Выделить highlights"
      3. "Сгенерировать recap thread"
      4. "Запланировать публикацию"

    config:
      template: "weekly_recap"
      format: "thread"
      platforms: ["twitter"]
      data_sources:
        - "analytics"
        - "recent_events"
        - "milestones"
```

## 3.2 Publish Actions

```yaml
publish_actions:

  immediate:
    description: "Опубликовать сейчас"
    use_cases:
      - "Срочные анонсы"
      - "Real-time события"
    config:
      queue_priority: "highest"
      bypass_schedule: true

  optimal:
    description: "В оптимальное время"
    use_cases:
      - "Обычный контент"
      - "Не срочное"
    config:
      algorithm: "find_next_optimal_slot"
      constraints:
        - "min_gap: 2h from last post"
        - "within: 24h"

  scheduled:
    description: "В указанное время"
    use_cases:
      - "Координированные кампании"
      - "Тайм-зоны аудитории"
    config:
      time: "specified"
      fallback: "next_available"

  distributed:
    description: "Распределить по времени"
    use_cases:
      - "Кросс-промо"
      - "Не спамить"
    config:
      gap: "2-4h between platforms"
      order: "by_audience_activity"
```

## 3.3 Notify Actions

```yaml
notify_actions:

  telegram:
    types:
      alert:
        format: "⚠️ {title}\n\n{message}"
        urgent: true

      info:
        format: "ℹ️ {title}\n\n{message}"
        urgent: false

      success:
        format: "✅ {title}\n\n{message}"
        urgent: false

      suggestion:
        format: |
          💡 Предложение

          {message}

          [Создать] [Игнорировать]
        buttons: true

  email:
    types:
      daily_digest:
        template: "daily_digest"
        schedule: "09:00"

      alert:
        template: "alert"
        immediate: true

  in_app:
    types:
      suggestion:
        display: "dashboard_widget"
        persistent: true

      alert:
        display: "notification_banner"
        dismissable: true
```

---

# 4. WORKFLOW CHAINS

## 4.1 Последовательные цепочки

```yaml
workflow_chains:

  product_launch:
    name: "Product Launch Campaign"
    trigger: "manual or scheduled"
    steps:

      - step: 1
        name: "Teaser"
        timing: "T-3d"
        action:
          type: "post"
          template: "teaser"
          platforms: ["twitter", "telegram"]
          content_hint: "Something big is coming..."

      - step: 2
        name: "Countdown"
        timing: "T-1d"
        action:
          type: "post"
          template: "countdown"
          platforms: ["twitter", "discord"]

      - step: 3
        name: "Launch Announcement"
        timing: "T"
        action:
          type: "generate_and_post"
          template: "major_announcement"
          platforms: "all"
          priority: "high"

      - step: 4
        name: "Feature Deep-dive"
        timing: "T+4h"
        action:
          type: "post"
          format: "thread"
          platforms: ["twitter"]

      - step: 5
        name: "Cross-promote"
        timing: "T+1d"
        action:
          type: "cross_promote"
          from: "this_product"
          to: "other_products"

      - step: 6
        name: "Early Results"
        timing: "T+3d"
        action:
          type: "generate_and_post"
          template: "early_results"
          data_source: "product_metrics"

      - step: 7
        name: "Feedback Request"
        timing: "T+7d"
        action:
          type: "post"
          template: "feedback_request"
          platforms: ["twitter", "discord"]

  engagement_recovery:
    name: "Engagement Recovery"
    trigger: "engagement_drop detected"
    steps:

      - step: 1
        name: "Analyze"
        timing: "immediate"
        action:
          type: "analyze"
          what: "recent_content_performance"
          output: "report"

      - step: 2
        name: "Notify"
        timing: "immediate"
        action:
          type: "notify"
          channel: "telegram"
          include: "analysis_report"

      - step: 3
        name: "Suggest"
        timing: "+1h"
        action:
          type: "ai_suggest"
          based_on: "what_worked_before"
          count: 3

      - step: 4
        name: "Generate"
        timing: "on_approval"
        action:
          type: "generate"
          from: "approved_suggestion"

      - step: 5
        name: "Monitor"
        timing: "+24h"
        action:
          type: "check_improvement"
          notify_result: true
```

## 4.2 Условная логика

```yaml
conditional_workflows:

  smart_response:
    trigger: "nft_sale"
    logic:
      - if: "price >= 10 ETH"
        then:
          - action: "whale_sale_post"
          - action: "notify_owner"
          - action: "cross_post_all"

      - elif: "price >= 1 ETH"
        then:
          - action: "significant_sale_post"
          - action: "notify_owner"

      - elif: "is_new_holder"
        then:
          - action: "welcome_holder_post"

      - else:
        then:
          - action: "log_only"

  content_based_routing:
    trigger: "ai_content_generated"
    logic:
      - if: "predicted_engagement > 5%"
        then:
          - platforms: "all"
          - priority: "high"

      - elif: "predicted_engagement > 3%"
        then:
          - platforms: ["twitter", "telegram"]
          - priority: "normal"

      - else:
        then:
          - action: "queue_for_review"
          - notify: "Low predicted engagement"
```

---

# 5. AUTOMATION TEMPLATES

## 5.1 Готовые автоматизации

```yaml
automation_templates:

  # ═══════════════════════════════════════════
  # SOCIAL PROOF
  # ═══════════════════════════════════════════

  share_success_stories:
    description: "Автоматически делиться успехами"
    triggers:
      - "5-star review received"
      - "customer testimonial"
      - "case study published"
    action:
      template: "social_proof"
      delay: "random(2h-24h)"
      platforms: ["twitter", "linkedin"]

  celebrate_milestones:
    description: "Праздновать достижения"
    triggers:
      - "user_count milestone"
      - "revenue milestone"
      - "feature usage milestone"
    action:
      template: "milestone_celebration"
      platforms: "all"
      include_stats: true

  # ═══════════════════════════════════════════
  # ENGAGEMENT
  # ═══════════════════════════════════════════

  weekly_engagement:
    description: "Еженедельные посты для вовлечения"
    schedule: "friday 16:00"
    action:
      type: "generate"
      style: "engaging_question"
      rotate_topics: true

  daily_value:
    description: "Ежедневный полезный контент"
    schedule: "weekdays 12:00"
    action:
      type: "post_from_library"
      category: "tips"
      fallback: "generate_new"

  # ═══════════════════════════════════════════
  # MONITORING
  # ═══════════════════════════════════════════

  performance_alerts:
    description: "Алерты о performance"
    monitors:
      - "engagement_drop > 50%"
      - "follower_loss > 100/day"
      - "post_failed"
    action:
      notify: "telegram"
      urgency: "high"

  opportunity_detection:
    description: "Обнаружение возможностей"
    monitors:
      - "viral_content"
      - "trending_topic_match"
      - "competitor_gap"
    action:
      notify: "telegram"
      include: "suggested_action"
```

## 5.2 Создание кастомных автоматизаций

```yaml
custom_automation_builder:

  ui_flow:
    1. "Выбрать триггер (event/schedule/metric)"
    2. "Настроить условия"
    3. "Выбрать действия"
    4. "Настроить параметры"
    5. "Тестировать"
    6. "Активировать"

  example:
    name: "VIP Customer Alert"
    trigger:
      type: "webhook"
      event: "new_order"
    conditions:
      - "order.total > 1000"
      - "customer.lifetime_value > 5000"
    actions:
      - type: "notify"
        channel: "telegram"
        message: "🎯 VIP заказ: {order.total}$ от {customer.name}"
      - type: "generate_post"
        template: "vip_celebration"
        schedule: "random(1h-4h)"
        review: true
```

---

# 6. УПРАВЛЕНИЕ

## 6.1 Dashboard автоматизаций

```
┌─────────────────────────────────────────────────────────────────┐
│  AUTOMATIONS                                    [+ New] [Docs]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACTIVE (8)                                                      │
│  ─────────                                                       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟢 NFT Mint Spotlight                    Last: 2h ago      ││
│  │    When: Rare mint (score > 95)          Posts: 47         ││
│  │    Action: Generate & post to Twitter, Discord              ││
│  │                                    [Edit] [Pause] [Stats]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟢 Weekly Recap                          Last: 3d ago      ││
│  │    When: Every Monday 10:00              Posts: 12         ││
│  │    Action: Generate recap thread                            ││
│  │                                    [Edit] [Pause] [Stats]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🟢 Engagement Recovery                   Last: never       ││
│  │    When: Engagement drops > 50%          Triggers: 0       ││
│  │    Action: Analyze → Notify → Suggest                       ││
│  │                                    [Edit] [Pause] [Stats]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  PAUSED (2)                                                      │
│  ──────────                                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ⏸️ Sale Notifications                   Paused: 5d ago     ││
│  │    Reason: "Too many posts, adjusting"                      ││
│  │                                           [Resume] [Edit]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  RECENT ACTIVITY                                                 │
│  ───────────────                                                 │
│  12:34  NFT Mint Spotlight → Posted "Soul #4521..."            │
│  10:00  Weekly Recap → Posted thread (8 tweets)                │
│  09:15  Daily Tip → Posted tip #47                              │
│  Yesterday 18:00  Sale Notification → Posted "Whale alert..."  │
│                                                                  │
│  [View All Activity]                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 6.2 Тестирование

```yaml
testing:

  dry_run:
    description: "Запустить без реальных действий"
    output:
      - "Что бы произошло"
      - "Какой контент бы сгенерировался"
      - "Куда бы опубликовалось"

  test_event:
    description: "Отправить тестовое событие"
    command: "nexus automation test nft-mint --data='{ token_id: 9999 }'"
    output: "Execution log"

  simulation:
    description: "Симулировать неделю автоматизаций"
    input: "historical_events"
    output:
      - "Сколько постов бы создалось"
      - "Какие паттерны"
      - "Потенциальные проблемы"
```

## 6.3 Мониторинг

```yaml
monitoring:

  health_checks:
    - "Webhook endpoints responding"
    - "Queue processing normally"
    - "AI generation working"
    - "Publishing successful"

  alerts:
    automation_failed:
      notify: "telegram"
      urgency: "high"

    too_many_posts:
      condition: "posts_today > 20"
      notify: "telegram"
      action: "pause_low_priority"

    no_activity:
      condition: "no_triggers_24h"
      notify: "telegram"
      message: "Нет активности автоматизаций за 24ч"

  logs:
    retention: "30 days"
    searchable: true
    exportable: true
```

---

# 7. SAFETY CONTROLS

## 7.1 Ограничения

```yaml
safety_limits:

  rate_limits:
    posts_per_hour: 5
    posts_per_day: 30
    posts_per_platform_per_day: 10

  gap_requirements:
    min_gap_same_platform: "2h"
    min_gap_same_product: "1h"

  content_review:
    always_review:
      - "High-value announcements"
      - "Negative sentiment responses"
      - "Competitor mentions"

    auto_approve:
      - "Template-based posts"
      - "Recurring content"
      - "Low-risk categories"

  kill_switches:
    global_pause: "Cmd+Shift+P"
    pause_product: "Per product"
    pause_automation: "Per automation"
```

## 7.2 Fallbacks

```yaml
fallbacks:

  ai_generation_fails:
    1. "Retry with different prompt"
    2. "Use template instead"
    3. "Notify and skip"

  publishing_fails:
    1. "Retry 3 times with backoff"
    2. "Try alternative platform"
    3. "Queue for manual review"

  webhook_fails:
    1. "Log event"
    2. "Retry later"
    3. "Alert if persistent"
```

---

# 8. API & INTEGRATIONS

## 8.1 Webhook API

```yaml
webhook_api:

  endpoint: "POST /api/events/{product}"

  authentication:
    method: "HMAC signature"
    header: "X-Nexus-Signature"
    algorithm: "SHA256"

  payload_format:
    event: "event_type"
    timestamp: "ISO 8601"
    data: "event_specific_data"

  example:
    request:
      POST /api/events/nft
      X-Nexus-Signature: sha256=abc123...
      Content-Type: application/json

      {
        "event": "mint",
        "timestamp": "2025-01-15T14:30:00Z",
        "data": {
          "token_id": 4521,
          "rarity_score": 98,
          "archetype": "Sage"
        }
      }

    response:
      {
        "received": true,
        "automation_triggered": "nft_mint_spotlight",
        "action_id": "act_xyz123"
      }
```

## 8.2 CLI Interface

```bash
# Управление автоматизациями
$ nexus automation list
$ nexus automation status nft-mint
$ nexus automation pause nft-mint
$ nexus automation resume nft-mint

# Тестирование
$ nexus automation test nft-mint --payload='{"token_id": 9999}'
$ nexus automation dry-run weekly-recap

# Логи
$ nexus automation logs --last=24h
$ nexus automation logs nft-mint --limit=50
```

---

**Следующий документ:** 04-CONTENT-STUDIO.md
