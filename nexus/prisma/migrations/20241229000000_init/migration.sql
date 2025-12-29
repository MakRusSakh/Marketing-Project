-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "brandVoice" JSONB,
    "webhookSecret" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "platformName" TEXT,
    "credentials" JSONB NOT NULL,
    "settings" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastUsedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "originalText" TEXT NOT NULL,
    "adapted" JSONB,
    "contentType" TEXT NOT NULL DEFAULT 'post',
    "templateId" UUID,
    "media" JSONB,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiPrompt" TEXT,
    "aiModel" TEXT,
    "predictions" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" UUID NOT NULL,
    "contentId" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "platformPostId" TEXT,
    "platformUrl" TEXT,
    "threadIds" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" TEXT NOT NULL,
    "triggerConfig" JSONB NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "triggerCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "automationsTriggered" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" UUID NOT NULL,
    "automationId" UUID NOT NULL,
    "eventId" UUID,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "actionsExecuted" JSONB,
    "errorMessage" TEXT,
    "triggerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "productId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'post',
    "platforms" TEXT[],
    "structure" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_createdAt_idx" ON "products"("createdAt");

-- CreateIndex
CREATE INDEX "channels_productId_idx" ON "channels"("productId");

-- CreateIndex
CREATE INDEX "channels_platform_idx" ON "channels"("platform");

-- CreateIndex
CREATE INDEX "channels_status_idx" ON "channels"("status");

-- CreateIndex
CREATE UNIQUE INDEX "channels_productId_platform_key" ON "channels"("productId", "platform");

-- CreateIndex
CREATE INDEX "contents_productId_idx" ON "contents"("productId");

-- CreateIndex
CREATE INDEX "contents_templateId_idx" ON "contents"("templateId");

-- CreateIndex
CREATE INDEX "contents_status_idx" ON "contents"("status");

-- CreateIndex
CREATE INDEX "contents_contentType_idx" ON "contents"("contentType");

-- CreateIndex
CREATE INDEX "contents_createdAt_idx" ON "contents"("createdAt");

-- CreateIndex
CREATE INDEX "publications_contentId_idx" ON "publications"("contentId");

-- CreateIndex
CREATE INDEX "publications_channelId_idx" ON "publications"("channelId");

-- CreateIndex
CREATE INDEX "publications_status_idx" ON "publications"("status");

-- CreateIndex
CREATE INDEX "publications_scheduledAt_idx" ON "publications"("scheduledAt");

-- CreateIndex
CREATE INDEX "publications_publishedAt_idx" ON "publications"("publishedAt");

-- CreateIndex
CREATE INDEX "automations_productId_idx" ON "automations"("productId");

-- CreateIndex
CREATE INDEX "automations_triggerType_idx" ON "automations"("triggerType");

-- CreateIndex
CREATE INDEX "automations_enabled_idx" ON "automations"("enabled");

-- CreateIndex
CREATE INDEX "automations_lastTriggered_idx" ON "automations"("lastTriggered");

-- CreateIndex
CREATE INDEX "events_productId_idx" ON "events"("productId");

-- CreateIndex
CREATE INDEX "events_eventType_idx" ON "events"("eventType");

-- CreateIndex
CREATE INDEX "events_processed_idx" ON "events"("processed");

-- CreateIndex
CREATE INDEX "events_createdAt_idx" ON "events"("createdAt");

-- CreateIndex
CREATE INDEX "automation_logs_automationId_idx" ON "automation_logs"("automationId");

-- CreateIndex
CREATE INDEX "automation_logs_eventId_idx" ON "automation_logs"("eventId");

-- CreateIndex
CREATE INDEX "automation_logs_status_idx" ON "automation_logs"("status");

-- CreateIndex
CREATE INDEX "automation_logs_startedAt_idx" ON "automation_logs"("startedAt");

-- CreateIndex
CREATE INDEX "templates_productId_idx" ON "templates"("productId");

-- CreateIndex
CREATE INDEX "templates_category_idx" ON "templates"("category");

-- CreateIndex
CREATE INDEX "templates_contentType_idx" ON "templates"("contentType");

-- CreateIndex
CREATE INDEX "templates_isSystem_idx" ON "templates"("isSystem");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

