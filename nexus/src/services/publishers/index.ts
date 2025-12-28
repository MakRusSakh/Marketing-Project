/**
 * Publishers Module
 * Social media platform publishers for the Marketing Nexus platform
 */

// Types
export type {
  Publisher,
  PublishOptions,
  PublishResult,
  AccountInfo,
  PublisherCredentials,
  EmbedData,
  PublishJob,
  QueuedJob,
  JobStatus,
  QueueConfig
} from './types';

// Twitter Publisher
export { TwitterPublisher } from './twitter-publisher';
export type { TwitterCredentials, TwitterPublishOptions } from './twitter-publisher';

// Telegram Publisher
export { TelegramPublisher } from './telegram-publisher';
export type {
  TelegramCredentials,
  TelegramPublishOptions,
  TelegramParseMode
} from './telegram-publisher';

// Discord Publisher
export { DiscordPublisher } from './discord-publisher';

// VK Publisher
export { VKPublisher } from './vk-publisher';

// Facebook Publisher
export { FacebookPublisher } from './facebook-publisher';
export type { FacebookCredentials, FacebookPublishOptions } from './facebook-publisher';

// Publishing Queue
export { PublishingQueue } from './publishing-queue';
