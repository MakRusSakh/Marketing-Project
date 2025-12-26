/**
 * Post Command
 * Publish content to specified platforms
 */

import { Command } from "commander";
import { PrismaClient } from "@prisma/client";
import { TwitterPublisher } from "../../src/services/publishers/twitter-publisher";
import { TelegramPublisher } from "../../src/services/publishers/telegram-publisher";
import { DiscordPublisher } from "../../src/services/publishers/discord-publisher";
import { VKPublisher } from "../../src/services/publishers/vk-publisher";
import type { Publisher } from "../../src/services/publishers/types";

const prisma = new PrismaClient();

interface PostOptions {
  platform: string;
  product: string;
  channel?: string;
  media?: string[];
  schedule?: string;
  immediate?: boolean;
}

export const postCommand = new Command("post")
  .description("Publish content to a specified platform")
  .argument("<content>", "Content to publish")
  .requiredOption("-p, --platform <platform>", "Target platform (twitter, telegram, discord, vk)")
  .requiredOption("--product <product>", "Product slug or ID")
  .option("-c, --channel <channel>", "Specific channel ID (optional)")
  .option("-m, --media <urls...>", "Media URLs to attach")
  .option("-s, --schedule <datetime>", "Schedule for later (ISO 8601 format)")
  .option("-i, --immediate", "Publish immediately (default)")
  .action(async (content: string, options: PostOptions) => {
    try {
      console.log("📤 Marketing Nexus - Post Command");
      console.log("━".repeat(50));

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new Error("Content cannot be empty");
      }

      // Find product
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id: options.product },
            { slug: options.product },
          ],
        },
        include: {
          channels: {
            where: {
              platform: options.platform,
              status: "active",
            },
          },
        },
      });

      if (!product) {
        throw new Error(`Product "${options.product}" not found`);
      }

      console.log(`📦 Product: ${product.name}`);

      // Find or select channel
      let channel;
      if (options.channel) {
        channel = product.channels.find((c) => c.id === options.channel);
        if (!channel) {
          throw new Error(`Channel "${options.channel}" not found`);
        }
      } else {
        channel = product.channels[0];
        if (!channel) {
          throw new Error(
            `No active ${options.platform} channel found for product "${product.name}"`
          );
        }
      }

      console.log(`📡 Channel: ${channel.platform} (${channel.id})`);
      console.log(`📝 Content: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`);

      // Create content record
      const contentRecord = await prisma.content.create({
        data: {
          productId: product.id,
          originalText: content,
          contentType: "post",
          status: "ready",
          media: options.media
            ? {
                urls: options.media,
              }
            : null,
        },
      });

      console.log(`✅ Content created: ${contentRecord.id}`);

      // Determine if scheduling or immediate publish
      const scheduledAt = options.schedule ? new Date(options.schedule) : null;

      if (scheduledAt) {
        // Schedule for later
        const publication = await prisma.publication.create({
          data: {
            contentId: contentRecord.id,
            channelId: channel.id,
            status: "scheduled",
            scheduledAt,
          },
        });

        console.log(`⏰ Scheduled for: ${scheduledAt.toLocaleString()}`);
        console.log(`📋 Publication ID: ${publication.id}`);
        console.log("\n✅ Content scheduled successfully!");
      } else {
        // Publish immediately
        console.log("\n🚀 Publishing now...");

        const publisher = await createPublisher(
          options.platform,
          channel.credentials as Record<string, any>
        );

        const result = await publisher.publish(content, {
          mediaUrls: options.media,
        });

        if (result.success) {
          // Update publication record
          const publication = await prisma.publication.create({
            data: {
              contentId: contentRecord.id,
              channelId: channel.id,
              status: "published",
              publishedAt: new Date(),
              platformPostId: result.postId,
              platformUrl: result.postUrl,
            },
          });

          console.log(`✅ Published successfully!`);
          console.log(`📋 Publication ID: ${publication.id}`);
          if (result.postUrl) {
            console.log(`🔗 URL: ${result.postUrl}`);
          }
        } else {
          // Record failure
          const publication = await prisma.publication.create({
            data: {
              contentId: contentRecord.id,
              channelId: channel.id,
              status: "failed",
              errorMessage: result.error || "Unknown error",
            },
          });

          console.error(`❌ Publication failed: ${result.error}`);
          console.log(`📋 Publication ID: ${publication.id}`);
          process.exit(1);
        }
      }

      console.log("\n" + "━".repeat(50));
    } catch (error) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });

/**
 * Create a publisher instance for the specified platform
 */
async function createPublisher(
  platform: string,
  credentials: Record<string, any>
): Promise<Publisher> {
  switch (platform.toLowerCase()) {
    case "twitter":
      return new TwitterPublisher(credentials);

    case "telegram":
      return new TelegramPublisher(credentials);

    case "discord":
      return new DiscordPublisher(credentials);

    case "vk":
      return new VKPublisher(credentials);

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
