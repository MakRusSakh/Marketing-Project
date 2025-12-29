import { Worker, Job, Queue } from "bullmq";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";

// Scheduler worker checks for publications that are due to be published
// and moves them to the publish queue

interface SchedulerJobData {
  checkTime: Date;
}

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Create publish queue to add jobs to
const publishQueue = new Queue("publish-queue", { connection });

// Check for due publications and queue them for publishing
async function checkDuePublications() {
  const now = new Date();

  console.log(`[Scheduler Worker] Checking for due publications at ${now.toISOString()}`);

  try {
    // Find all publications that are scheduled and due
    const duePublications = await prisma.publication.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        content: {
          select: {
            id: true,
            originalText: true,
          },
        },
        channel: {
          select: {
            id: true,
            platform: true,
            status: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    console.log(`[Scheduler Worker] Found ${duePublications.length} due publications`);

    let queued = 0;
    let skipped = 0;
    const missedSchedules: string[] = [];

    for (const publication of duePublications) {
      // Check if channel is active
      if (publication.channel.status !== "active") {
        console.warn(
          `[Scheduler Worker] Skipping publication ${publication.id} - channel ${publication.channel.id} is ${publication.channel.status}`
        );

        // Update publication status to failed
        await prisma.publication.update({
          where: { id: publication.id },
          data: {
            status: "failed",
            errorCode: "CHANNEL_INACTIVE",
            errorMessage: `Channel is ${publication.channel.status}`,
          },
        });

        skipped++;
        continue;
      }

      // Check if this is a missed schedule (more than 1 hour late)
      const scheduledAt = new Date(publication.scheduledAt!);
      const minutesLate = (now.getTime() - scheduledAt.getTime()) / (1000 * 60);

      if (minutesLate > 60) {
        console.warn(
          `[Scheduler Worker] Publication ${publication.id} is ${Math.round(minutesLate)} minutes late`
        );
        missedSchedules.push(publication.id);
      }

      try {
        // Add to publish queue
        await publishQueue.add(
          "publish",
          { publicationId: publication.id },
          {
            attempts: 3, // Retry up to 3 times
            backoff: {
              type: "exponential",
              delay: 60000, // Start with 1 minute delay
            },
            removeOnComplete: {
              age: 24 * 3600, // Keep completed jobs for 24 hours
              count: 1000, // Keep last 1000 completed jobs
            },
            removeOnFail: {
              age: 7 * 24 * 3600, // Keep failed jobs for 7 days
            },
          }
        );

        queued++;
        console.log(
          `[Scheduler Worker] Queued publication ${publication.id} for ${publication.channel.platform}`
        );
      } catch (error) {
        console.error(
          `[Scheduler Worker] Error queuing publication ${publication.id}:`,
          error
        );

        // Update publication with error
        await prisma.publication.update({
          where: { id: publication.id },
          data: {
            status: "failed",
            errorCode: "QUEUE_ERROR",
            errorMessage: error instanceof Error ? error.message : "Failed to queue publication",
          },
        });
      }
    }

    console.log(
      `[Scheduler Worker] Processed ${duePublications.length} publications: ${queued} queued, ${skipped} skipped`
    );

    // Log missed schedules for monitoring
    if (missedSchedules.length > 0) {
      console.warn(
        `[Scheduler Worker] ${missedSchedules.length} publications had missed schedules:`,
        missedSchedules
      );
    }

    return {
      total: duePublications.length,
      queued,
      skipped,
      missedSchedules: missedSchedules.length,
    };
  } catch (error) {
    console.error("[Scheduler Worker] Error checking due publications:", error);
    throw error;
  }
}

// Process scheduler job
async function processSchedulerJob(job: Job<SchedulerJobData>) {
  console.log(`[Scheduler Worker] Running scheduled check at ${job.data.checkTime}`);
  return checkDuePublications();
}

// Create the scheduler worker
export function createSchedulerWorker() {
  const worker = new Worker<SchedulerJobData>(
    "scheduler-queue",
    async (job) => {
      return processSchedulerJob(job);
    },
    {
      connection,
      concurrency: 1, // Only one scheduler should run at a time
    }
  );

  // Event handlers
  worker.on("completed", (job, result) => {
    console.log(
      `[Scheduler Worker] Check completed: ${result.queued} queued, ${result.skipped} skipped, ${result.missedSchedules} missed`
    );
  });

  worker.on("failed", (job, err) => {
    console.error(`[Scheduler Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Scheduler Worker] Worker error:", err);
  });

  worker.on("ready", () => {
    console.log("[Scheduler Worker] Worker is ready");
  });

  return worker;
}

// Setup recurring scheduler job
export async function setupSchedulerJob() {
  const schedulerQueue = new Queue("scheduler-queue", { connection });

  // Add a repeating job that runs every minute
  await schedulerQueue.add(
    "check-due-publications",
    { checkTime: new Date() },
    {
      repeat: {
        pattern: "* * * * *", // Cron pattern: every minute
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 24 * 3600, // Keep failed jobs for 24 hours
        count: 100,
      },
    }
  );

  console.log("[Scheduler] Recurring scheduler job set up to run every minute");

  return schedulerQueue;
}

export default createSchedulerWorker;
