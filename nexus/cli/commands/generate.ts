/**
 * Generate Command
 * Generate AI content and optionally publish it
 */

import { Command } from "commander";
import { PrismaClient } from "@prisma/client";
import { ClaudeClient } from "../../src/services/ai/claude-client";
import { ContentGenerator } from "../../src/services/ai/content-generator";
import { TwitterPublisher } from "../../src/services/publishers/twitter-publisher";
import { TelegramPublisher } from "../../src/services/publishers/telegram-publisher";
import { DiscordPublisher } from "../../src/services/publishers/discord-publisher";
import { VKPublisher } from "../../src/services/publishers/vk-publisher";
import type { Platform } from "../../src/services/ai/response-parser";
import type { Publisher } from "../../src/services/publishers/types";
import type { BrandVoice, ProductContext } from "../../src/services/ai/content-generator";

const prisma = new PrismaClient();

interface GenerateOptions {
  platform: string;
  type: "post" | "thread" | "article";
  product: string;
  publish?: boolean;
  schedule?: string;
  save?: boolean;
  length?: "short" | "medium" | "long";
  keywords?: string[];
}

export const generateCommand = new Command("generate")
  .description("Generate AI content for a platform")
  .argument("<topic>", "Topic or subject for content generation")
  .requiredOption("-p, --platform <platform>", "Target platform (twitter, telegram, discord, vk)")
  .requiredOption("--product <product>", "Product slug or ID")
  .option("-t, --type <type>", "Content type (post, thread, article)", "post")
  .option("--publish", "Publish immediately after generation")
  .option("-s, --schedule <datetime>", "Schedule for later (ISO 8601 format)")
  .option("--save", "Save as draft without publishing", true)
  .option("-l, --length <length>", "Content length (short, medium, long)", "medium")
  .option("-k, --keywords <keywords...>", "Keywords to include")
  .action(async (topic: string, options: GenerateOptions) => {
    try {
      console.log("🤖 Marketing Nexus - Generate Command");
      console.log("━".repeat(50));

      // Validate topic
      if (!topic || topic.trim().length === 0) {
        throw new Error("Topic cannot be empty");
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
      console.log(`💡 Topic: ${topic}`);
      console.log(`📱 Platform: ${options.platform}`);
      console.log(`📄 Type: ${options.type}`);

      // Parse brand voice from product
      const brandVoice: BrandVoice | undefined = product.brandVoice
        ? (product.brandVoice as any)
        : undefined;

      const productContext: ProductContext = {
        name: product.name,
        description: product.description || "",
        targetAudience: "general audience",
      };

      // Initialize AI services
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error("ANTHROPIC_API_KEY environment variable not set");
      }

      const claudeClient = new ClaudeClient(apiKey);
      const generator = new ContentGenerator(claudeClient);

      console.log("\n🔮 Generating content...");

      // Generate content
      const platform = options.platform as Platform;
      let generatedContent: string;
      let hashtags: string[] = [];

      if (options.type === "thread") {
        // Generate thread (3-5 posts)
        const thread = await generator.generateThread({
          product: productContext,
          brandVoice,
          platform,
          contentType: "post",
          topic,
          keywords: options.keywords,
          targetPosts: 5,
        });

        generatedContent = thread.posts.map((p) => p.content).join("\n\n---\n\n");
        hashtags = thread.posts[0]?.hashtags || [];

        console.log(`\n✅ Thread generated (${thread.posts.length} posts)`);
        console.log(`📊 Total characters: ${thread.totalCharacters}`);
        console.log(`⏱️  Estimated read time: ${thread.estimatedReadTime} seconds`);
      } else {
        // Generate single post
        const post = await generator.generatePost({
          product: productContext,
          brandVoice,
          platform,
          contentType: options.type as any,
          topic,
          keywords: options.keywords,
          length: options.length,
        });

        generatedContent = post.content;
        hashtags = post.hashtags;

        console.log(`\n✅ Content generated`);
        console.log(`📊 Characters: ${post.characterCount}`);
        console.log(`✓ Valid: ${post.isValid ? "Yes" : "No"}`);

        if (post.suggestions && post.suggestions.length > 0) {
          console.log(`💡 Suggestions:`);
          post.suggestions.forEach((s) => console.log(`   - ${s}`));
        }
      }

      // Display generated content
      console.log("\n" + "─".repeat(50));
      console.log(generatedContent);
      console.log("─".repeat(50));

      if (hashtags.length > 0) {
        console.log(`\n🏷️  Hashtags: ${hashtags.map((h) => `#${h}`).join(" ")}`);
      }

      // Create content record
      const contentRecord = await prisma.content.create({
        data: {
          productId: product.id,
          originalText: generatedContent,
          contentType: options.type,
          aiGenerated: true,
          aiPrompt: topic,
          aiModel: "claude-3-5-sonnet",
          status: options.publish ? "ready" : "draft",
          adapted: {
            [platform]: generatedContent,
          },
        },
      });

      console.log(`\n💾 Content saved: ${contentRecord.id}`);

      // Handle publishing
      if (options.publish || options.schedule) {
        const channel = product.channels[0];
        if (!channel) {
          throw new Error(
            `No active ${options.platform} channel found for product "${product.name}"`
          );
        }

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
        } else if (options.publish) {
          // Publish immediately
          console.log("\n🚀 Publishing now...");

          const publisher = await createPublisher(
            options.platform,
            channel.credentials as Record<string, any>
          );

          const result = await publisher.publish(generatedContent);

          if (result.success) {
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

            // Update content status
            await prisma.content.update({
              where: { id: contentRecord.id },
              data: { status: "published" },
            });

            console.log(`✅ Published successfully!`);
            console.log(`📋 Publication ID: ${publication.id}`);
            if (result.postUrl) {
              console.log(`🔗 URL: ${result.postUrl}`);
            }
          } else {
            console.error(`❌ Publication failed: ${result.error}`);

            // Record failure
            await prisma.publication.create({
              data: {
                contentId: contentRecord.id,
                channelId: channel.id,
                status: "failed",
                errorMessage: result.error || "Unknown error",
              },
            });
          }
        }
      } else {
        console.log("\n💾 Content saved as draft");
        console.log(`   Use --publish to publish immediately`);
        console.log(`   Use --schedule to schedule for later`);
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
