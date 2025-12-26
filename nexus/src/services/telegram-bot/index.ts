/**
 * Telegram Bot Service Exports
 * Centralized export for Telegram bot functionality
 */

export { MarketingNexusBot, type BotConfig } from "./bot";

/**
 * Example usage:
 *
 * import { MarketingNexusBot } from './services/telegram-bot';
 *
 * const bot = new MarketingNexusBot({
 *   token: process.env.TELEGRAM_BOT_TOKEN!,
 *   allowedUsers: [123456789],
 *   defaultProduct: 'my-product',
 *   redisUrl: process.env.REDIS_URL,
 *   anthropicApiKey: process.env.ANTHROPIC_API_KEY,
 * });
 *
 * await bot.start();
 */
