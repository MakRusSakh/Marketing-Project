/**
 * Analytics Service
 * Provides analytics data for publications, content, and channels
 */

import { PrismaClient } from "@prisma/client";
import { startOfDay, endOfDay, subDays } from "date-fns";

const prisma = new PrismaClient();

export interface DateRange {
  from: Date;
  to: Date;
}

export interface Stats {
  totalPublications: number;
  publishedCount: number;
  scheduledCount: number;
  failedCount: number;
  engagementRate: number;
  totalReach: number;
  averageEngagement: number;
  topPlatform: string;
  platformBreakdown: Record<string, number>;
  dailyStats: Array<{
    date: string;
    publications: number;
    engagement: number;
  }>;
}

export interface Performance {
  contentId: string;
  totalPublications: number;
  platforms: string[];
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  engagementRate: number;
  bestPerformingPlatform: string;
  publicationDetails: Array<{
    platform: string;
    publishedAt: Date;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    platformUrl?: string;
  }>;
}

export interface Metrics {
  channelId: string;
  platform: string;
  totalPublications: number;
  successRate: number;
  failureRate: number;
  averageEngagement: number;
  totalReach: number;
  lastPublishedAt?: Date;
  errorCount: number;
  topPerformingContent: Array<{
    contentId: string;
    preview: string;
    engagement: number;
    publishedAt: Date;
  }>;
  recentPublications: Array<{
    id: string;
    status: string;
    publishedAt?: Date;
    scheduledAt?: Date;
    errorMessage?: string;
  }>;
}

export interface Dashboard {
  productId: string;
  productName: string;
  overview: {
    totalContent: number;
    totalPublications: number;
    totalChannels: number;
    activeAutomations: number;
  };
  performance: {
    publishedToday: number;
    scheduledUpcoming: number;
    failedLast24h: number;
    avgEngagementRate: number;
  };
  platformDistribution: Array<{
    platform: string;
    count: number;
    percentage: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: "published" | "scheduled" | "failed" | "generated";
    description: string;
    timestamp: Date;
    platform?: string;
  }>;
  topContent: Array<{
    contentId: string;
    preview: string;
    platforms: string[];
    totalEngagement: number;
    publishedAt: Date;
  }>;
  channelHealth: Array<{
    channelId: string;
    platform: string;
    status: string;
    successRate: number;
    lastUsed?: Date;
  }>;
}

/**
 * Analytics Service Class
 */
export class AnalyticsService {
  /**
   * Get publication statistics for a product within a date range
   */
  async getPublicationStats(
    productId: string,
    dateRange?: DateRange
  ): Promise<Stats> {
    const range = dateRange || {
      from: subDays(new Date(), 30),
      to: new Date(),
    };

    const publications = await prisma.publication.findMany({
      where: {
        content: {
          productId,
        },
        createdAt: {
          gte: startOfDay(range.from),
          lte: endOfDay(range.to),
        },
      },
      include: {
        channel: true,
        content: true,
      },
    });

    const totalPublications = publications.length;
    const publishedCount = publications.filter(
      (p) => p.status === "published"
    ).length;
    const scheduledCount = publications.filter(
      (p) => p.status === "scheduled"
    ).length;
    const failedCount = publications.filter((p) => p.status === "failed").length;

    // Calculate engagement metrics
    let totalEngagement = 0;
    let totalReach = 0;
    const platformBreakdown: Record<string, number> = {};

    publications.forEach((pub) => {
      const metrics = pub.metrics as any;
      if (metrics) {
        const engagement =
          (metrics.likes || 0) +
          (metrics.shares || 0) +
          (metrics.comments || 0);
        totalEngagement += engagement;
        totalReach += metrics.views || 0;
      }

      const platform = pub.channel.platform;
      platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
    });

    const averageEngagement =
      publishedCount > 0 ? totalEngagement / publishedCount : 0;
    const engagementRate =
      totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // Find top platform
    const topPlatform =
      Object.entries(platformBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "none";

    // Calculate daily stats
    const dailyStatsMap = new Map<string, { publications: number; engagement: number }>();

    publications.forEach((pub) => {
      const dateKey = pub.createdAt.toISOString().split("T")[0];
      const current = dailyStatsMap.get(dateKey) || { publications: 0, engagement: 0 };

      const metrics = pub.metrics as any;
      const engagement = metrics
        ? (metrics.likes || 0) + (metrics.shares || 0) + (metrics.comments || 0)
        : 0;

      dailyStatsMap.set(dateKey, {
        publications: current.publications + 1,
        engagement: current.engagement + engagement,
      });
    });

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({
        date,
        publications: stats.publications,
        engagement: stats.engagement,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPublications,
      publishedCount,
      scheduledCount,
      failedCount,
      engagementRate,
      totalReach,
      averageEngagement,
      topPlatform,
      platformBreakdown,
      dailyStats,
    };
  }

  /**
   * Get performance metrics for a specific content
   */
  async getContentPerformance(contentId: string): Promise<Performance> {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        publications: {
          include: {
            channel: true,
          },
        },
      },
    });

    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const publications = content.publications;
    const platforms = [
      ...new Set(publications.map((p) => p.channel.platform)),
    ];

    let totalViews = 0;
    let totalLikes = 0;
    let totalShares = 0;
    let totalComments = 0;

    const platformEngagement: Record<string, number> = {};

    const publicationDetails = publications
      .filter((p) => p.status === "published")
      .map((pub) => {
        const metrics = pub.metrics as any;
        const views = metrics?.views || 0;
        const likes = metrics?.likes || 0;
        const shares = metrics?.shares || 0;
        const comments = metrics?.comments || 0;

        totalViews += views;
        totalLikes += likes;
        totalShares += shares;
        totalComments += comments;

        const engagement = likes + shares + comments;
        const platform = pub.channel.platform;
        platformEngagement[platform] =
          (platformEngagement[platform] || 0) + engagement;

        return {
          platform: pub.channel.platform,
          publishedAt: pub.publishedAt || new Date(),
          views,
          likes,
          shares,
          comments,
          platformUrl: pub.platformUrl,
        };
      });

    const totalEngagement = totalLikes + totalShares + totalComments;
    const engagementRate =
      totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    const bestPerformingPlatform =
      Object.entries(platformEngagement).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "none";

    return {
      contentId,
      totalPublications: publications.length,
      platforms,
      totalViews,
      totalLikes,
      totalShares,
      totalComments,
      engagementRate,
      bestPerformingPlatform,
      publicationDetails,
    };
  }

  /**
   * Get metrics for a specific channel
   */
  async getChannelMetrics(channelId: string): Promise<Metrics> {
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        publications: {
          include: {
            content: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    const publications = channel.publications;
    const totalPublications = publications.length;

    const publishedCount = publications.filter(
      (p) => p.status === "published"
    ).length;
    const failedCount = publications.filter((p) => p.status === "failed").length;

    const successRate =
      totalPublications > 0 ? (publishedCount / totalPublications) * 100 : 0;
    const failureRate =
      totalPublications > 0 ? (failedCount / totalPublications) * 100 : 0;

    let totalEngagement = 0;
    let totalReach = 0;
    let errorCount = 0;

    const contentEngagement = new Map<string, {
      contentId: string;
      preview: string;
      engagement: number;
      publishedAt: Date;
    }>();

    publications.forEach((pub) => {
      const metrics = pub.metrics as any;
      if (metrics) {
        const engagement =
          (metrics.likes || 0) +
          (metrics.shares || 0) +
          (metrics.comments || 0);
        totalEngagement += engagement;
        totalReach += metrics.views || 0;

        // Track content engagement
        if (pub.status === "published") {
          const existing = contentEngagement.get(pub.contentId);
          if (!existing || engagement > existing.engagement) {
            contentEngagement.set(pub.contentId, {
              contentId: pub.contentId,
              preview: pub.content.originalText.substring(0, 100),
              engagement,
              publishedAt: pub.publishedAt || new Date(),
            });
          }
        }
      }

      if (pub.status === "failed") {
        errorCount++;
      }
    });

    const averageEngagement =
      publishedCount > 0 ? totalEngagement / publishedCount : 0;

    const topPerformingContent = Array.from(contentEngagement.values())
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);

    const recentPublications = publications.slice(0, 10).map((pub) => ({
      id: pub.id,
      status: pub.status,
      publishedAt: pub.publishedAt || undefined,
      scheduledAt: pub.scheduledAt || undefined,
      errorMessage: pub.errorMessage || undefined,
    }));

    const lastPublishedPub = publications.find(
      (p) => p.status === "published" && p.publishedAt
    );

    return {
      channelId,
      platform: channel.platform,
      totalPublications,
      successRate,
      failureRate,
      averageEngagement,
      totalReach,
      lastPublishedAt: lastPublishedPub?.publishedAt || undefined,
      errorCount,
      topPerformingContent,
      recentPublications,
    };
  }

  /**
   * Get overall dashboard data for a product
   */
  async getOverallDashboard(productId: string): Promise<Dashboard> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        contents: {
          include: {
            publications: {
              include: {
                channel: true,
              },
            },
          },
        },
        channels: true,
        automations: true,
      },
    });

    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const contents = product.contents;
    const channels = product.channels;
    const automations = product.automations;

    // Overview
    const allPublications = contents.flatMap((c) => c.publications);
    const overview = {
      totalContent: contents.length,
      totalPublications: allPublications.length,
      totalChannels: channels.length,
      activeAutomations: automations.filter((a) => a.enabled).length,
    };

    // Performance metrics
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);

    const publishedToday = allPublications.filter(
      (p) =>
        p.status === "published" &&
        p.publishedAt &&
        p.publishedAt >= today
    ).length;

    const scheduledUpcoming = allPublications.filter(
      (p) =>
        p.status === "scheduled" &&
        p.scheduledAt &&
        p.scheduledAt > new Date()
    ).length;

    const failedLast24h = allPublications.filter(
      (p) =>
        p.status === "failed" &&
        p.updatedAt >= yesterday
    ).length;

    let totalEngagement = 0;
    let totalReach = 0;

    allPublications.forEach((pub) => {
      const metrics = pub.metrics as any;
      if (metrics && pub.status === "published") {
        const engagement =
          (metrics.likes || 0) +
          (metrics.shares || 0) +
          (metrics.comments || 0);
        totalEngagement += engagement;
        totalReach += metrics.views || 0;
      }
    });

    const publishedCount = allPublications.filter(
      (p) => p.status === "published"
    ).length;
    const avgEngagementRate =
      totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    const performance = {
      publishedToday,
      scheduledUpcoming,
      failedLast24h,
      avgEngagementRate,
    };

    // Platform distribution
    const platformCount: Record<string, number> = {};
    allPublications.forEach((pub) => {
      const platform = pub.channel.platform;
      platformCount[platform] = (platformCount[platform] || 0) + 1;
    });

    const totalPubs = allPublications.length || 1; // Avoid division by zero
    const platformDistribution = Object.entries(platformCount).map(
      ([platform, count]) => ({
        platform,
        count,
        percentage: (count / totalPubs) * 100,
      })
    );

    // Recent activity
    const recentActivity = allPublications
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((pub) => {
        let type: "published" | "scheduled" | "failed" | "generated";
        let description: string;

        if (pub.status === "published") {
          type = "published";
          description = `Published to ${pub.channel.platform}`;
        } else if (pub.status === "scheduled") {
          type = "scheduled";
          description = `Scheduled for ${pub.channel.platform}`;
        } else if (pub.status === "failed") {
          type = "failed";
          description = `Failed to publish to ${pub.channel.platform}`;
        } else {
          type = "generated";
          description = `Created for ${pub.channel.platform}`;
        }

        return {
          id: pub.id,
          type,
          description,
          timestamp: pub.updatedAt,
          platform: pub.channel.platform,
        };
      });

    // Top content by engagement
    const contentEngagement = new Map<string, {
      contentId: string;
      preview: string;
      platforms: string[];
      totalEngagement: number;
      publishedAt: Date;
    }>();

    contents.forEach((content) => {
      let totalContentEngagement = 0;
      const platforms: string[] = [];
      let latestPublished: Date | null = null;

      content.publications.forEach((pub) => {
        if (pub.status === "published") {
          platforms.push(pub.channel.platform);
          const metrics = pub.metrics as any;
          if (metrics) {
            const engagement =
              (metrics.likes || 0) +
              (metrics.shares || 0) +
              (metrics.comments || 0);
            totalContentEngagement += engagement;
          }
          if (pub.publishedAt && (!latestPublished || pub.publishedAt > latestPublished)) {
            latestPublished = pub.publishedAt;
          }
        }
      });

      if (platforms.length > 0 && latestPublished) {
        contentEngagement.set(content.id, {
          contentId: content.id,
          preview: content.originalText.substring(0, 100),
          platforms: [...new Set(platforms)],
          totalEngagement: totalContentEngagement,
          publishedAt: latestPublished,
        });
      }
    });

    const topContent = Array.from(contentEngagement.values())
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 5);

    // Channel health
    const channelHealth = channels.map((channel) => {
      const channelPubs = allPublications.filter(
        (p) => p.channelId === channel.id
      );
      const published = channelPubs.filter((p) => p.status === "published").length;
      const total = channelPubs.length || 1;
      const successRate = (published / total) * 100;

      return {
        channelId: channel.id,
        platform: channel.platform,
        status: channel.status,
        successRate,
        lastUsed: channel.lastUsedAt || undefined,
      };
    });

    return {
      productId,
      productName: product.name,
      overview,
      performance,
      platformDistribution,
      recentActivity,
      topContent,
      channelHealth,
    };
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    await prisma.$disconnect();
  }
}

// Export a singleton instance
export const analyticsService = new AnalyticsService();
