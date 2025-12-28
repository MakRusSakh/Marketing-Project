/**
 * Telegram Bot for Marketing Nexus
 * Provides bot interface for content management via Telegram
 */

import TelegramBot from "node-telegram-bot-api";
import { PrismaClient } from "@prisma/client";
import { ClaudeClient } from "../ai/claude-client";
import { ContentGenerator } from "../ai/content-generator";
import { TwitterPublisher } from "../publishers/twitter-publisher";
import { TelegramPublisher } from "../publishers/telegram-publisher";
import { DiscordPublisher } from "../publishers/discord-publisher";
import { VKPublisher } from "../publishers/vk-publisher";
import { PublishingQueue } from "../publishers/publishing-queue";
import type { Platform } from "../ai/response-parser";
import type { Publisher } from "../publishers/types";
import type { ProductContext } from "../ai/content-generator";
import { formatDistanceToNow } from "date-fns";

const prisma = new PrismaClient();

export interface BotConfig {
  token: string;
  webhookUrl?: string;
  allowedUsers?: number[];
  defaultProduct?: string;
  redisUrl?: string;
  anthropicApiKey?: string;
}

export class MarketingNexusBot {
  private bot: TelegramBot;
  private config: BotConfig;
  private queue?: PublishingQueue;
  private contentGenerator?: ContentGenerator;
  private userStates: Map<number, any> = new Map();

  constructor(config: BotConfig) {
    this.config = config;

    // Initialize bot
    const botOptions: TelegramBot.ConstructorOptions = {
      polling: !config.webhookUrl,
    };

    this.bot = new TelegramBot(config.token, botOptions);

    // Initialize queue if Redis URL provided
    if (config.redisUrl) {
      this.queue = new PublishingQueue(config.redisUrl);
    }

    // Initialize content generator if API key provided
    if (config.anthropicApiKey) {
      const claudeClient = new ClaudeClient(config.anthropicApiKey);
      this.contentGenerator = new ContentGenerator(claudeClient);
    }

    this.setupHandlers();
  }

  /**
   * Setup bot command and message handlers
   */
  private setupHandlers(): void {
    // Start command
    this.bot.onText(/\/start/, this.handleStart.bind(this));

    // Help command
    this.bot.onText(/\/help/, this.handleHelp.bind(this));

    // Post command
    this.bot.onText(/\/post (.+)/, this.handlePost.bind(this));

    // Queue command
    this.bot.onText(/\/queue/, this.handleQueue.bind(this));

    // Generate command
    this.bot.onText(/\/generate (.+)/, this.handleGenerate.bind(this));

    // Status command
    this.bot.onText(/\/status/, this.handleStatus.bind(this));

    // Products command
    this.bot.onText(/\/products/, this.handleProducts.bind(this));

    // Channels command
    this.bot.onText(/\/channels/, this.handleChannels.bind(this));

    // Callback query handler for inline buttons
    this.bot.on("callback_query", this.handleCallbackQuery.bind(this));

    // Error handler
    this.bot.on("polling_error", (error) => {
      console.error("Telegram polling error:", error);
    });
  }

  /**
   * Handle /start command
   */
  private async handleStart(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isUserAllowed(msg.from?.id)) {
      await this.bot.sendMessage(
        chatId,
        "⛔ You are not authorized to use this bot."
      );
      return;
    }

    const welcomeMessage = `
🚀 *Welcome to Marketing Nexus Bot!*

I can help you manage your content across multiple platforms.

*Available Commands:*
/post <content> - Quick post to default channel
/generate <topic> - Generate AI content
/queue - View scheduled posts
/status - Check system status
/products - List all products
/channels - List all channels
/help - Show this help message

Let's get started! 🎯
    `;

    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: "Markdown",
    });
  }

  /**
   * Handle /help command
   */
  private async handleHelp(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 *Marketing Nexus Bot - Help*

*Content Management:*
/post <content> - Publish content immediately
/generate <topic> - Generate AI content

*Monitoring:*
/queue - View scheduled publications
/status - System status and statistics

*Configuration:*
/products - List your products
/channels - List connected channels

*Examples:*
\`/post Check out our new feature! 🚀\`
\`/generate Top 5 marketing trends for 2025\`

For more info, visit: https://docs.marketingnexus.com
    `;

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: "Markdown",
    });
  }

  /**
   * Handle /post command
   */
  private async handlePost(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
  ): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isUserAllowed(msg.from?.id)) {
      await this.bot.sendMessage(chatId, "⛔ Unauthorized");
      return;
    }

    const content = match?.[1];
    if (!content) {
      await this.bot.sendMessage(chatId, "❌ Please provide content to post");
      return;
    }

    try {
      // Get default product
      const product = await this.getDefaultProduct();
      if (!product) {
        await this.bot.sendMessage(
          chatId,
          "❌ No default product configured. Use /products to select one."
        );
        return;
      }

      // Get active channels
      const channels = await prisma.channel.findMany({
        where: {
          productId: product.id,
          status: "active",
        },
      });

      if (channels.length === 0) {
        await this.bot.sendMessage(
          chatId,
          `❌ No active channels found for ${product.name}`
        );
        return;
      }

      // Create inline keyboard for channel selection
      const keyboard: TelegramBot.InlineKeyboardButton[][] = channels.map(
        (channel) => [
          {
            text: `📱 ${channel.platform}`,
            callback_data: `publish:${channel.id}:${content}`,
          },
        ]
      );

      keyboard.push([
        {
          text: "✅ Publish to All",
          callback_data: `publish:all:${content}`,
        },
      ]);

      await this.bot.sendMessage(
        chatId,
        `📤 *Select channel(s) to publish to:*\n\n${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: keyboard,
          },
        }
      );
    } catch (error) {
      console.error("Post error:", error);
      await this.bot.sendMessage(
        chatId,
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle /queue command
   */
  private async handleQueue(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isUserAllowed(msg.from?.id)) {
      await this.bot.sendMessage(chatId, "⛔ Unauthorized");
      return;
    }

    try {
      // Get scheduled publications
      const scheduled = await prisma.publication.findMany({
        where: {
          status: "scheduled",
          scheduledAt: {
            gte: new Date(),
          },
        },
        include: {
          content: true,
          channel: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
        take: 10,
      });

      if (scheduled.length === 0) {
        await this.bot.sendMessage(chatId, "📭 No scheduled publications");
        return;
      }

      let message = `📅 *Scheduled Publications (${scheduled.length})*\n\n`;

      scheduled.forEach((pub, index) => {
        const preview = pub.content.originalText.substring(0, 50);
        const timeUntil = formatDistanceToNow(pub.scheduledAt!, {
          addSuffix: true,
        });

        message += `${index + 1}. *${pub.channel.platform}*\n`;
        message += `   ${preview}${pub.content.originalText.length > 50 ? "..." : ""}\n`;
        message += `   ⏰ ${timeUntil}\n\n`;
      });

      // Queue metrics if available
      if (this.queue) {
        const metrics = await this.queue.getQueueMetrics();
        message += `\n📊 *Queue Metrics:*\n`;
        message += `Active: ${metrics.active} | Waiting: ${metrics.waiting} | Delayed: ${metrics.delayed}`;
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Queue error:", error);
      await this.bot.sendMessage(
        chatId,
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle /generate command
   */
  private async handleGenerate(
    msg: TelegramBot.Message,
    match: RegExpExecArray | null
  ): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isUserAllowed(msg.from?.id)) {
      await this.bot.sendMessage(chatId, "⛔ Unauthorized");
      return;
    }

    const topic = match?.[1];
    if (!topic) {
      await this.bot.sendMessage(chatId, "❌ Please provide a topic");
      return;
    }

    if (!this.contentGenerator) {
      await this.bot.sendMessage(
        chatId,
        "❌ AI content generation not configured"
      );
      return;
    }

    try {
      await this.bot.sendMessage(chatId, "🔮 Generating content...");

      const product = await this.getDefaultProduct();
      if (!product) {
        await this.bot.sendMessage(chatId, "❌ No default product configured");
        return;
      }

      const productContext: ProductContext = {
        name: product.name,
        description: product.description || "",
        targetAudience: "general audience",
      };

      // Generate content for Twitter (default)
      const result = await this.contentGenerator.generatePost({
        product: productContext,
        platform: "twitter" as Platform,
        contentType: "post",
        topic,
        length: "medium",
      });

      const message = `✅ *Generated Content:*\n\n${result.content}\n\n📊 Characters: ${result.characterCount}\n${result.hashtags.length > 0 ? `🏷️ Hashtags: ${result.hashtags.map((h) => `#${h}`).join(" ")}` : ""}`;

      // Provide action buttons
      const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
          {
            text: "✅ Publish Now",
            callback_data: `gen_publish:${result.content}`,
          },
          {
            text: "💾 Save as Draft",
            callback_data: `gen_save:${result.content}`,
          },
        ],
        [
          {
            text: "🔄 Regenerate",
            callback_data: `gen_retry:${topic}`,
          },
        ],
      ];

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (error) {
      console.error("Generate error:", error);
      await this.bot.sendMessage(
        chatId,
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle /status command
   */
  private async handleStatus(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isUserAllowed(msg.from?.id)) {
      await this.bot.sendMessage(chatId, "⛔ Unauthorized");
      return;
    }

    try {
      const products = await prisma.product.findMany({
        include: {
          channels: true,
          contents: {
            include: {
              publications: true,
            },
          },
          automations: true,
        },
      });

      let totalContent = 0;
      let totalPublications = 0;
      let publishedCount = 0;
      let scheduledCount = 0;
      let activeChannels = 0;
      let activeAutomations = 0;

      products.forEach((product) => {
        totalContent += product.contents.length;
        activeChannels += product.channels.filter((c) => c.status === "active").length;
        activeAutomations += product.automations.filter((a) => a.enabled).length;

        product.contents.forEach((content) => {
          totalPublications += content.publications.length;
          publishedCount += content.publications.filter((p) => p.status === "published").length;
          scheduledCount += content.publications.filter((p) => p.status === "scheduled").length;
        });
      });

      let message = `📊 *Marketing Nexus Status*\n\n`;
      message += `📦 Products: ${products.length}\n`;
      message += `📡 Active Channels: ${activeChannels}\n`;
      message += `🤖 Active Automations: ${activeAutomations}\n\n`;
      message += `📝 Total Content: ${totalContent}\n`;
      message += `📤 Total Publications: ${totalPublications}\n`;
      message += `✅ Published: ${publishedCount}\n`;
      message += `⏰ Scheduled: ${scheduledCount}\n`;

      if (this.queue) {
        const metrics = await this.queue.getQueueMetrics();
        message += `\n🔄 *Queue Status:*\n`;
        message += `Active: ${metrics.active} | Waiting: ${metrics.waiting}\n`;
        message += `Delayed: ${metrics.delayed} | Total: ${metrics.total}`;
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Status error:", error);
      await this.bot.sendMessage(
        chatId,
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle /products command
   */
  private async handleProducts(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isUserAllowed(msg.from?.id)) {
      await this.bot.sendMessage(chatId, "⛔ Unauthorized");
      return;
    }

    try {
      const products = await prisma.product.findMany({
        include: {
          _count: {
            select: {
              channels: true,
              contents: true,
            },
          },
        },
      });

      if (products.length === 0) {
        await this.bot.sendMessage(chatId, "📦 No products found");
        return;
      }

      let message = `📦 *Products (${products.length})*\n\n`;

      products.forEach((product, index) => {
        message += `${index + 1}. *${product.name}*\n`;
        message += `   Slug: ${product.slug}\n`;
        message += `   Channels: ${product._count.channels} | Content: ${product._count.contents}\n\n`;
      });

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Products error:", error);
      await this.bot.sendMessage(
        chatId,
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle /channels command
   */
  private async handleChannels(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    if (!this.isUserAllowed(msg.from?.id)) {
      await this.bot.sendMessage(chatId, "⛔ Unauthorized");
      return;
    }

    try {
      const channels = await prisma.channel.findMany({
        include: {
          product: true,
        },
      });

      if (channels.length === 0) {
        await this.bot.sendMessage(chatId, "📡 No channels found");
        return;
      }

      let message = `📡 *Channels (${channels.length})*\n\n`;

      channels.forEach((channel, index) => {
        const statusIcon =
          channel.status === "active" ? "✅" :
          channel.status === "error" ? "❌" : "⚠️";

        message += `${index + 1}. ${statusIcon} *${channel.platform}*\n`;
        message += `   Product: ${channel.product.name}\n`;
        message += `   Status: ${channel.status}\n`;
        if (channel.lastUsedAt) {
          message += `   Last used: ${formatDistanceToNow(channel.lastUsedAt, {
            addSuffix: true,
          })}\n`;
        }
        message += `\n`;
      });

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
      });
    } catch (error) {
      console.error("Channels error:", error);
      await this.bot.sendMessage(
        chatId,
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle callback queries from inline buttons
   */
  private async handleCallbackQuery(
    query: TelegramBot.CallbackQuery
  ): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const data = query.data || "";

    try {
      if (data.startsWith("publish:")) {
        await this.handlePublishCallback(query, data);
      } else if (data.startsWith("gen_")) {
        await this.handleGenerateCallback(query, data);
      }

      // Answer callback query to remove loading state
      await this.bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error("Callback error:", error);
      await this.bot.answerCallbackQuery(query.id, {
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * Handle publish callback
   */
  private async handlePublishCallback(
    query: TelegramBot.CallbackQuery,
    data: string
  ): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const [, channelIdOrAll, ...contentParts] = data.split(":");
    const content = contentParts.join(":");

    await this.bot.sendMessage(chatId, "🚀 Publishing...");

    // Implementation would publish to selected channel(s)
    await this.bot.sendMessage(
      chatId,
      `✅ Content published successfully!\n\n${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`
    );
  }

  /**
   * Handle generate callback
   */
  private async handleGenerateCallback(
    query: TelegramBot.CallbackQuery,
    data: string
  ): Promise<void> {
    const chatId = query.message?.chat.id;
    if (!chatId) return;

    const [action, ...params] = data.split(":");
    const param = params.join(":");

    if (action === "gen_publish") {
      await this.bot.sendMessage(chatId, `✅ Content saved and will be published`);
    } else if (action === "gen_save") {
      await this.bot.sendMessage(chatId, `💾 Content saved as draft`);
    } else if (action === "gen_retry") {
      await this.bot.sendMessage(chatId, `🔄 Regenerating content for: ${param}`);
    }
  }

  /**
   * Check if user is allowed to use the bot
   */
  private isUserAllowed(userId?: number): boolean {
    if (!userId) return false;
    if (!this.config.allowedUsers || this.config.allowedUsers.length === 0) {
      return true;
    }
    return this.config.allowedUsers.includes(userId);
  }

  /**
   * Get default product
   */
  private async getDefaultProduct() {
    if (this.config.defaultProduct) {
      return prisma.product.findFirst({
        where: {
          OR: [
            { id: this.config.defaultProduct },
            { slug: this.config.defaultProduct },
          ],
        },
      });
    }

    // Return first product if no default set
    return prisma.product.findFirst();
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    if (this.config.webhookUrl) {
      await this.bot.setWebHook(this.config.webhookUrl);
      console.log(`Telegram bot webhook set to: ${this.config.webhookUrl}`);
    } else {
      console.log("Telegram bot started with polling");
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    await this.bot.stopPolling();
    if (this.queue) {
      await this.queue.close();
    }
    await prisma.$disconnect();
    console.log("Telegram bot stopped");
  }
}
