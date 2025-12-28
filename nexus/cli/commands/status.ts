/**
 * Status Command
 * Show queue status and publication statistics
 */

import { Command } from "commander";
import { PrismaClient } from "@prisma/client";
import { PublishingQueue } from "../../src/services/publishers/publishing-queue";
import { formatDistanceToNow } from "date-fns";

const prisma = new PrismaClient();

interface StatusOptions {
  product?: string;
  platform?: string;
  detailed?: boolean;
  queue?: boolean;
}

export const statusCommand = new Command("status")
  .description("Show queue status and publication statistics")
  .option("--product <product>", "Filter by product slug or ID")
  .option("--platform <platform>", "Filter by platform")
  .option("-d, --detailed", "Show detailed information")
  .option("-q, --queue", "Show queue metrics")
  .action(async (options: StatusOptions) => {
    try {
      console.log("📊 Marketing Nexus - Status Report");
      console.log("━".repeat(50));

      // Build filter conditions
      const productFilter = options.product
        ? {
            OR: [
              { id: options.product },
              { slug: options.product },
            ],
          }
        : undefined;

      // Find products
      const products = await prisma.product.findMany({
        where: productFilter,
        include: {
          channels: options.platform
            ? {
                where: {
                  platform: options.platform,
                },
              }
            : true,
          contents: {
            include: {
              publications: {
                include: {
                  channel: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: options.detailed ? 100 : 10,
          },
        },
      });

      if (products.length === 0) {
        console.log("ℹ️  No products found");
        return;
      }

      // Calculate overall statistics
      let totalContent = 0;
      let totalPublications = 0;
      let publishedCount = 0;
      let scheduledCount = 0;
      let failedCount = 0;
      let activeChannels = 0;

      const platformStats: Record<string, number> = {};

      products.forEach((product) => {
        totalContent += product.contents.length;
        activeChannels += product.channels.filter((c) => c.status === "active").length;

        product.contents.forEach((content) => {
          totalPublications += content.publications.length;

          content.publications.forEach((pub) => {
            if (pub.status === "published") publishedCount++;
            if (pub.status === "scheduled") scheduledCount++;
            if (pub.status === "failed") failedCount++;

            const platform = pub.channel.platform;
            platformStats[platform] = (platformStats[platform] || 0) + 1;
          });
        });
      });

      // Display overall summary
      console.log("\n📈 Overall Statistics");
      console.log("─".repeat(50));
      console.log(`Products:           ${products.length}`);
      console.log(`Active Channels:    ${activeChannels}`);
      console.log(`Total Content:      ${totalContent}`);
      console.log(`Total Publications: ${totalPublications}`);
      console.log("");
      console.log(`✅ Published:       ${publishedCount}`);
      console.log(`⏰ Scheduled:       ${scheduledCount}`);
      console.log(`❌ Failed:          ${failedCount}`);

      // Platform breakdown
      if (Object.keys(platformStats).length > 0) {
        console.log("\n📱 Platform Breakdown");
        console.log("─".repeat(50));
        Object.entries(platformStats)
          .sort((a, b) => b[1] - a[1])
          .forEach(([platform, count]) => {
            const percentage = ((count / totalPublications) * 100).toFixed(1);
            console.log(`${platform.padEnd(15)} ${count.toString().padStart(4)} (${percentage}%)`);
          });
      }

      // Queue metrics
      if (options.queue) {
        try {
          const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
          const queue = new PublishingQueue(redisUrl);

          const metrics = await queue.getQueueMetrics();

          console.log("\n🔄 Queue Metrics");
          console.log("─".repeat(50));
          console.log(`Waiting:   ${metrics.waiting}`);
          console.log(`Active:    ${metrics.active}`);
          console.log(`Delayed:   ${metrics.delayed}`);
          console.log(`Completed: ${metrics.completed}`);
          console.log(`Failed:    ${metrics.failed}`);
          console.log(`Total:     ${metrics.total}`);

          await queue.close();
        } catch (error) {
          console.log("\n⚠️  Queue metrics unavailable (Redis connection failed)");
        }
      }

      // Detailed product breakdown
      if (options.detailed) {
        console.log("\n📦 Product Details");
        console.log("━".repeat(50));

        for (const product of products) {
          console.log(`\n${product.name} (${product.slug})`);
          console.log("─".repeat(50));

          // Channels
          console.log(`\n📡 Channels (${product.channels.length}):`);
          product.channels.forEach((channel) => {
            const statusIcon =
              channel.status === "active" ? "✅" :
              channel.status === "error" ? "❌" : "⚠️";

            console.log(`   ${statusIcon} ${channel.platform} - ${channel.status}`);
            if (channel.lastUsedAt) {
              console.log(
                `      Last used: ${formatDistanceToNow(channel.lastUsedAt, {
                  addSuffix: true,
                })}`
              );
            }
          });

          // Recent content
          console.log(`\n📝 Recent Content (${Math.min(product.contents.length, 5)}):`);
          product.contents.slice(0, 5).forEach((content) => {
            const preview = content.originalText.substring(0, 60);
            const published = content.publications.filter((p) => p.status === "published").length;
            const scheduled = content.publications.filter((p) => p.status === "scheduled").length;

            console.log(`\n   ${content.id.substring(0, 8)}...`);
            console.log(`   ${preview}${content.originalText.length > 60 ? "..." : ""}`);
            console.log(`   Status: ${content.status} | Published: ${published} | Scheduled: ${scheduled}`);
            console.log(
              `   Created: ${formatDistanceToNow(content.createdAt, {
                addSuffix: true,
              })}`
            );
          });

          // Upcoming scheduled publications
          const upcomingPubs = product.contents
            .flatMap((c) => c.publications)
            .filter((p) => p.status === "scheduled" && p.scheduledAt && p.scheduledAt > new Date())
            .sort((a, b) => (a.scheduledAt!.getTime() - b.scheduledAt!.getTime()))
            .slice(0, 5);

          if (upcomingPubs.length > 0) {
            console.log(`\n⏰ Upcoming Publications (${upcomingPubs.length}):`);
            upcomingPubs.forEach((pub) => {
              const content = product.contents.find((c) =>
                c.publications.some((p) => p.id === pub.id)
              );
              const preview = content?.originalText.substring(0, 40) || "";

              console.log(`\n   ${pub.channel.platform} - ${pub.scheduledAt!.toLocaleString()}`);
              console.log(`   ${preview}${(content?.originalText.length || 0) > 40 ? "..." : ""}`);
              console.log(
                `   In ${formatDistanceToNow(pub.scheduledAt!, {
                  addSuffix: false,
                })}`
              );
            });
          }

          // Recent failures
          const recentFailures = product.contents
            .flatMap((c) => c.publications)
            .filter((p) => p.status === "failed")
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 3);

          if (recentFailures.length > 0) {
            console.log(`\n❌ Recent Failures (${recentFailures.length}):`);
            recentFailures.forEach((pub) => {
              console.log(`\n   ${pub.channel.platform} - ${pub.updatedAt.toLocaleString()}`);
              if (pub.errorMessage) {
                console.log(`   Error: ${pub.errorMessage.substring(0, 100)}`);
              }
              console.log(`   Retry count: ${pub.retryCount}`);
            });
          }
        }
      }

      // Quick tips
      if (!options.detailed) {
        console.log("\n💡 Tips:");
        console.log("   Use -d or --detailed for more information");
        console.log("   Use -q or --queue to see queue metrics");
        console.log("   Use --product <slug> to filter by product");
        console.log("   Use --platform <name> to filter by platform");
      }

      console.log("\n" + "━".repeat(50));
    } catch (error) {
      console.error("\n❌ Error:", error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  });
