# Деплой NEXUS на Railway

## Быстрый старт

### 1. Создайте проект на Railway

1. Перейдите на [railway.app](https://railway.app)
2. Создайте новый проект
3. Добавьте сервисы:
   - **PostgreSQL** (из шаблонов)
   - **Redis** (из шаблонов)
   - **GitHub Repo** (ваш репозиторий)

### 2. Настройте переменные окружения

В настройках сервиса (Variables) добавьте:

```env
# Database (автоматически от Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (автоматически от Railway Redis)
REDIS_URL=${{Redis.REDIS_URL}}

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Image Generation (опционально)
STABILITY_API_KEY=sk-...
REPLICATE_API_TOKEN=r8_...

# Social Platforms (по необходимости)
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

TELEGRAM_BOT_TOKEN=...

FACEBOOK_ACCESS_TOKEN=...
FACEBOOK_PAGE_ID=...

DISCORD_BOT_TOKEN=...
DISCORD_CHANNEL_ID=...

VK_ACCESS_TOKEN=...
VK_GROUP_ID=...

# App Config
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
NODE_ENV=production
```

### 3. Деплой

Railway автоматически:
1. Обнаружит `railway.toml`
2. Соберёт Docker образ
3. Запустит миграции БД
4. Запустит приложение

## Архитектура на Railway

```
┌─────────────────────────────────────────────────┐
│                  Railway Project                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │  PostgreSQL  │  │    Redis     │             │
│  │   Database   │  │    Cache     │             │
│  └──────┬───────┘  └──────┬───────┘             │
│         │                  │                     │
│         └────────┬─────────┘                     │
│                  │                               │
│         ┌────────┴────────┐                      │
│         │   NEXUS App     │                      │
│         │   (Next.js)     │                      │
│         │   Port 3000     │                      │
│         └─────────────────┘                      │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Сервисы

### Основное приложение
- **Dockerfile**: Многоэтапная сборка
- **Health Check**: `/api/health`
- **Port**: 3000

### Workers (опционально, отдельный сервис)

Для фоновых задач создайте отдельный сервис:

1. Добавьте ещё один сервис из того же репозитория
2. Переопределите Start Command:
   ```
   npm run workers
   ```

## Мониторинг

### Health Endpoint

```bash
curl https://your-app.railway.app/api/health
```

Ответ:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "0.1.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Логи

Railway предоставляет логи в реальном времени в дашборде.

## Масштабирование

В `railway.toml`:
```toml
[deploy]
numReplicas = 2  # Увеличьте количество реплик
```

## Домен

1. Railway → Settings → Domains
2. Добавьте свой домен или используйте `*.railway.app`
3. Обновите `NEXT_PUBLIC_APP_URL`

## Troubleshooting

### Ошибка подключения к БД
- Проверьте `DATABASE_URL`
- Убедитесь, что PostgreSQL сервис запущен

### Ошибка сборки
```bash
# Локально проверьте сборку
docker build -t nexus .
```

### Миграции не применяются
```bash
# Вручную запустите
railway run npm run db:migrate
```

## Стоимость

Railway billing:
- **Hobby**: $5/месяц (включает кредиты)
- **Pro**: $20/месяц (командная работа)

Примерные ресурсы:
- PostgreSQL: ~$5/месяц
- Redis: ~$3/месяц
- App: ~$5-10/месяц

**Итого**: ~$15-20/месяц для базового деплоя
