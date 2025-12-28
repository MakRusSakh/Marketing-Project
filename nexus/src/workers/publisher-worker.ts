import { Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";

// Publisher worker processes publication jobs from the queue
// Each job contains a publication ID that needs to be published

interface PublishJobData {
  publicationId: string;
}

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Platform publishers (these would be implemented in /lib/publishers)
async function publishToTwitter(
  content: string,
  credentials: any,
  media?: any
): Promise<{ postId: string; url: string }> {
  // Implementation would use Twitter API
  // For now, this is a placeholder
  return {
    postId: `twitter_${Date.now()}`,
    url: `https://twitter.com/user/status/${Date.now()}`,
  };
}

async function publishToLinkedIn(
  content: string,
  credentials: any,
  media?: any
): Promise<{ postId: string; url: string }> {
  // Implementation would use LinkedIn API
  return {
    postId: `linkedin_${Date.now()}`,
    url: `https://linkedin.com/posts/${Date.now()}`,
  };
}

async function publishToFacebook(
  content: string,
  credentials: any,
  media?: any
): Promise<{ postId: string; url: string }> {
  // Implementation would use Facebook Graph API
  return {
    postId: `facebook_${Date.now()}`,
    url: `https://facebook.com/posts/${Date.now()}`,
  };
}

async function publishToInstagram(
  content: string,
  credentials: any,
  media?: any
): Promise<{ postId: string; url: string }> {
  // Implementation would use Instagram Graph API
  return {
    postId: `instagram_${Date.now()}`,
    url: `https://instagram.com/p/${Date.now()}`,
  };
}

async function publishToYouTube(
  content: string,
  credentials: any,
  media?: any
): Promise<{ postId: string; url: string }> {
  // Implementation would use YouTube API
  return {
    postId: `youtube_${Date.now()}`,
    url: `https://youtube.com/watch?v=${Date.now()}`,
  };
}

// Main publisher function that routes to the appropriate platform
async function publishContent(
  platform: string,
  content: string,
  credentials: any,
  media?: any
): Promise<{ postId: string; url: string }> {
  switch (platform.toLowerCase()) {
    case "twitter":
      return publishToTwitter(content, credentials, media);
    case "linkedin":
      return publishToLinkedIn(content, credentials, media);
    case "facebook":
      return publishToFacebook(content, credentials, media);
    case "instagram":
      return publishToInstagram(content, credentials, media);
    case "youtube":
      return publishToYouTube(content, credentials, media);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Process a single publication job
async function processPublication(job: Job<PublishJobData>) {
  const { publicationId } = job.data;

  console.log(`[Publisher Worker] Processing publication ${publicationId}`);

  try {
    // Fetch the publication with related content and channel
    const publication = await prisma.publication.findUnique({
      where: { id: publicationId },
      include: {
        content: true,
        channel: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!publication) {
      throw new Error(`Publication ${publicationId} not found`);
    }

    // Update status to publishing
    await prisma.publication.update({
      where: { id: publicationId },
      data: { status: "publishing" },
    });

    // Get the adapted content for this platform, or fall back to original
    const adaptedContent = publication.content.adapted as any;
    let contentToPublish = publication.content.originalText;

    if (adaptedContent && adaptedContent[publication.channel.platform]) {
      contentToPublish = adaptedContent[publication.channel.platform];
    }

    // Publish to the platform
    const result = await publishContent(
      publication.channel.platform,
      contentToPublish,
      publication.channel.credentials,
      publication.content.media
    );

    // Update publication with success
    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        status: "published",
        publishedAt: new Date(),
        platformPostId: result.postId,
        platformUrl: result.url,
        errorCode: null,
        errorMessage: null,
      },
    });

    // Update channel last used
    await prisma.channel.update({
      where: { id: publication.channelId },
      data: {
        lastUsedAt: new Date(),
        status: "active",
        errorMessage: null,
      },
    });

    // Update content status
    await prisma.content.update({
      where: { id: publication.contentId },
      data: { status: "published" },
    });

    console.log(
      `[Publisher Worker] Successfully published ${publicationId} to ${publication.channel.platform}`
    );

    return { success: true, result };
  } catch (error: any) {
    console.error(`[Publisher Worker] Error publishing ${publicationId}:`, error);

    // Update publication with error
    await prisma.publication.update({
      where: { id: publicationId },
      data: {
        status: "failed",
        errorCode: error.code || "UNKNOWN_ERROR",
        errorMessage: error.message || "An unknown error occurred",
        retryCount: { increment: 1 },
      },
    });

    // Update channel error status if it's a channel-related error
    if (error.code === "INVALID_CREDENTIALS" || error.code === "UNAUTHORIZED") {
      const publication = await prisma.publication.findUnique({
        where: { id: publicationId },
        select: { channelId: true },
      });

      if (publication) {
        await prisma.channel.update({
          where: { id: publication.channelId },
          data: {
            status: "error",
            errorMessage: error.message,
          },
        });
      }
    }

    throw error;
  }
}

// Create the publisher worker
export function createPublisherWorker() {
  const worker = new Worker<PublishJobData>(
    "publish-queue",
    async (job) => {
      return processPublication(job);
    },
    {
      connection,
      concurrency: 5, // Process up to 5 publications concurrently
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // per second (to respect rate limits)
      },
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Exponential backoff: 1min, 5min, 15min, 30min, 1hr
          const delays = [60000, 300000, 900000, 1800000, 3600000];
          return delays[Math.min(attemptsMade - 1, delays.length - 1)];
        },
      },
    }
  );

  // Event handlers
  worker.on("completed", (job) => {
    console.log(`[Publisher Worker] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Publisher Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Publisher Worker] Worker error:", err);
  });

  worker.on("ready", () => {
    console.log("[Publisher Worker] Worker is ready and waiting for jobs");
  });

  return worker;
}

export default createPublisherWorker;
