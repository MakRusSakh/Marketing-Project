# MVP+ OVERVIEW
## Обзор продвинутой версии MVP

**Версия:** 1.0  
**Модуль:** 01-OVERVIEW

---

# 1. ЧТО ТАКОЕ MVP+

## Отличие от минимального MVP

| Аспект | Минимальный MVP | MVP+ (наш выбор) |
|--------|-----------------|------------------|
| Цель | Проверить гипотезу | Выйти на рынок с конкурентным продуктом |
| Срок | 2-3 месяца | 4-5 месяцев |
| Функционал | Базовый | Полноценный для целевого сегмента |
| UX | Приемлемый | Отточенный |
| Масштаб | 1 сценарий | 3-4 ключевых сценария |

## Почему MVP+

1. **Рынок насыщен** — базовый планировщик постов никого не удивит
2. **AI — наше преимущество** — нужно показать его мощь сразу
3. **B2B требует надёжности** — бизнес не будет терпеть сырой продукт
4. **Первое впечатление** — второго шанса не будет

---

# 2. SCOPE MVP+

## Включено в MVP+

### Модули

```
✅ Content Studio (полный)
   ├── AI Text Generator
   ├── Template Library (30+ шаблонов)
   ├── Brand Voice Configuration
   └── Multi-platform Adaptation

✅ Publishing Engine (полный)
   ├── 7 платформ (Twitter, Discord, Telegram, VK, Instagram, Facebook, LinkedIn)
   ├── Smart Scheduling
   ├── Queue Management
   └── Approval Workflow

✅ Analytics Center (расширенный)
   ├── Real-time Dashboard
   ├── Per-post Metrics
   ├── Platform Comparison
   ├── Basic Predictions
   └── Export (PDF, CSV)

✅ Campaign Manager (базовый+)
   ├── Campaign Builder
   ├── Content Calendar
   ├── Basic A/B Testing
   └── Recurring Posts

✅ Integration Hub (полный)
   ├── REST API (полный)
   ├── Webhooks (in/out)
   └── Zapier Integration

✅ Workspace Manager (базовый+)
   ├── До 3 workspaces
   ├── Team (до 5 человек)
   ├── Role Management
   └── Basic Audit Log
```

## Отложено на Phase 2

```
⏳ Image Generation (DALL-E)
⏳ Video Script Generation
⏳ Advanced A/B Testing
⏳ Competitor Analysis
⏳ White-label
⏳ SSO (SAML/OIDC)
⏳ On-premise
⏳ China/Korea/Japan channels
⏳ Native mobile apps
```

---

# 3. ЦЕЛЕВЫЕ ПЛАТФОРМЫ MVP+

## Социальные сети

| Платформа | Приоритет | Функционал MVP+ |
|-----------|-----------|-----------------|
| **Twitter/X** | P0 | Посты, threads, изображения, scheduling |
| **Discord** | P0 | Каналы, embeds, роли, webhooks |
| **Telegram** | P0 | Каналы, боты, форматирование |
| **ВКонтакте** | P1 | Посты, изображения, scheduling |
| **Instagram** | P1 | Посты, карусели (через Graph API) |
| **Facebook** | P1 | Страницы, посты |
| **LinkedIn** | P2 | Посты, статьи |

## Критерии приоритетов

- **P0:** Must have для запуска (Web3 + RU core)
- **P1:** Нужно в первый месяц после запуска
- **P2:** Можно добавить в течение квартала

---

# 4. ЦЕЛЕВАЯ АУДИТОРИЯ MVP+

## Primary: Web3/NFT проекты

**Почему они первые:**
- Высокая потребность в автоматизации
- Техническая грамотность (API-интеграции)
- Готовность платить за экономию времени
- Активное комьюнити (сарафан)

**Их боли:**
- Ручное постинг 5-10 раз в день
- Разные каналы требуют разный контент
- Нет времени на аналитику
- Хотят реагировать на события (mint, sale) автоматически

## Secondary: SMM-агентства (RU)

**Почему они вторые:**
- Управляют множеством клиентов
- Ценят автоматизацию
- Готовы к новым инструментам

**Их боли:**
- Переключение между клиентами
- Ручное создание отчётов
- Нет единого инструмента для RU + Global

---

# 5. SUCCESS METRICS MVP+

## Продуктовые метрики

| Метрика | Target | Измерение |
|---------|--------|-----------|
| Time to First Post | < 15 мин | От регистрации до публикации |
| Activation Rate | > 60% | Опубликовали хотя бы 1 пост за 7 дней |
| AI Usage Rate | > 50% | Используют AI-генерацию |
| Weekly Active | > 40% | Возвращаются каждую неделю |
| NPS | > 40 | Опрос после 30 дней |

## Бизнес-метрики (за 3 месяца после запуска)

| Метрика | Target |
|---------|--------|
| Регистрации | 500+ |
| Активные проекты | 150+ |
| Платящие клиенты | 50+ |
| MRR | $5,000+ |
| Churn (monthly) | < 10% |

---

# 6. TIMELINE MVP+

```
Месяц 1: Foundation
├── Week 1-2: Архитектура, инфраструктура, auth
├── Week 3-4: Content Studio (core)
└── Deliverable: Можно создавать и генерировать контент

Месяц 2: Publishing
├── Week 5-6: Publishing Engine (Twitter, Discord, Telegram)
├── Week 7-8: Queue, Scheduling, VK
└── Deliverable: Можно публиковать в 4 канала

Месяц 3: Analytics & Campaigns
├── Week 9-10: Analytics Dashboard, метрики
├── Week 11-12: Campaign Builder, Calendar
└── Deliverable: Полный цикл создание→публикация→аналитика

Месяц 4: Integration & Polish
├── Week 13-14: REST API, Webhooks, Instagram/FB
├── Week 15-16: LinkedIn, Workspaces, Teams
└── Deliverable: API-ready, multi-workspace

Месяц 5: Beta & Launch
├── Week 17-18: Closed Beta (50 пользователей)
├── Week 19-20: Fixes, polish, onboarding
└── Deliverable: Public Launch
```

---

# 7. КОМАНДА MVP+

## Минимальный состав

| Роль | Кол-во | Фокус |
|------|--------|-------|
| Tech Lead | 1 | Архитектура, code review, AI integration |
| Backend Developer | 2 | API, integrations, publishing engine |
| Frontend Developer | 2 | UI/UX, dashboard, analytics |
| DevOps | 0.5 | Infrastructure, CI/CD, monitoring |
| Product Manager | 1 | Roadmap, priorities, user research |
| Designer | 0.5 | UI/UX, design system |

**Итого: 6-7 человек**

## Опционально (ускорение)

- +1 Backend для параллельной работы над интеграциями
- +1 QA для тестирования

---

# 8. БЮДЖЕТ MVP+

## Разработка (5 месяцев)

| Статья | Сумма/мес | Итого |
|--------|-----------|-------|
| Команда (7 чел) | 1.5M ₽ | 7.5M ₽ |
| Инфраструктура | 80K ₽ | 400K ₽ |
| API (Claude, соцсети) | 50K ₽ | 250K ₽ |
| Инструменты | 30K ₽ | 150K ₽ |
| **Итого разработка** | | **~8.5M ₽** |

## После запуска (monthly)

| Статья | Сумма/мес |
|--------|-----------|
| Инфраструктура | 100-200K ₽ |
| API costs | 50-150K ₽ |
| Поддержка | 200K ₽ |
| Маркетинг | 200K ₽ |
| **Итого операционные** | **550-750K ₽** |

---

# 9. РИСКИ MVP+

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| API соцсетей изменятся | Средняя | Высокое | Абстракция, мониторинг, fallback |
| AI-генерация некачественная | Низкая | Высокое | Prompt engineering, human review |
| Медленный рост | Средняя | Среднее | Product-led growth, community |
| Конкуренты скопируют | Высокая | Низкое | Скорость итераций, UX |
| Не хватит бюджета | Низкая | Критичное | Резерв 20%, фазирование |

---

# 10. СТРУКТУРА ДОКУМЕНТАЦИИ

## Файлы детализации

```
01-OVERVIEW.md          ← Вы здесь
02-USER-STORIES.md      — User stories по модулям
03-CONTENT-STUDIO.md    — Детали модуля контента
04-PUBLISHING.md        — Детали публикации
05-ANALYTICS.md         — Детали аналитики
06-CAMPAIGNS.md         — Детали кампаний
07-INTEGRATIONS.md      — API и интеграции
08-WORKSPACES.md        — Управление пространствами
09-UI-WIREFRAMES.md     — Описание интерфейса
10-TECH-ARCHITECTURE.md — Техническая архитектура
11-DATA-MODEL.md        — Модель данных
12-DEVELOPMENT-PLAN.md  — План разработки
```

---

**Следующий файл:** 02-USER-STORIES.md
