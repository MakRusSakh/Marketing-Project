/**
 * Publishing Queue
 * Manages job scheduling and queueing for content publishing using BullMQ
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import type {
  PublishJob,
  QueuedJob,
  JobStatus,
  PublishResult,
  QueueConfig,
} from './types';

/**
 * PublishingQueue manages the queuing and scheduling of content publishing jobs
 * Uses BullMQ for robust job processing with Redis as the backing store
 */
export class PublishingQueue {
  private queue: Queue<PublishJob>;
  private worker: Worker<PublishJob, PublishResult> | null = null;
  private queueEvents: QueueEvents | null = null;
  private connection: Redis;
  private queueName = 'publishing-queue';

  /**
   * Creates a new Publishing Queue
   * @param redisUrl - Redis connection URL (default: redis://localhost:6379)
   * @param config - Queue configuration options
   */
  constructor(redisUrl?: string, config?: QueueConfig) {
    const connectionUrl = redisUrl || config?.redisUrl || 'redis://localhost:6379';

    // Create Redis connection
    this.connection = new Redis(connectionUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    // Initialize queue
    this.queue = new Queue<PublishJob>(this.queueName, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: config?.defaultJobOptions?.attempts || 3,
        backoff: config?.defaultJobOptions?.backoff || {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: config?.defaultJobOptions?.removeOnComplete ?? 100,
        removeOnFail: config?.defaultJobOptions?.removeOnFail ?? 1000,
      },
    });

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents(this.queueName, {
      connection: this.connection.duplicate(),
    });
  }

  /**
   * Add a job to the queue for immediate processing
   * @param job - The publishing job to queue
   * @returns Job ID
   */
  async addToQueue(job: PublishJob): Promise<string> {
    try {
      const bullJob = await this.queue.add(
        'publish-content',
        job,
        {
          priority: job.priority || 0,
        }
      );

      return bullJob.id || '';
    } catch (error) {
      throw new Error(
        `Failed to add job to queue: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Schedule a publishing job for a specific time
   * @param job - The publishing job to schedule
   * @param publishAt - When to publish the content
   * @returns Job ID
   */
  async schedulePublish(job: PublishJob, publishAt: Date): Promise<string> {
    try {
      const delay = publishAt.getTime() - Date.now();

      if (delay < 0) {
        throw new Error('Cannot schedule job in the past');
      }

      const bullJob = await this.queue.add(
        'publish-content',
        job,
        {
          delay,
          priority: job.priority || 0,
        }
      );

      return bullJob.id || '';
    } catch (error) {
      throw new Error(
        `Failed to schedule job: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get all jobs currently waiting in the queue
   * @returns Array of queued jobs
   */
  async getQueuedJobs(): Promise<QueuedJob[]> {
    try {
      const [waitingJobs, activeJobs] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
      ]);

      const allJobs = [...waitingJobs, ...activeJobs];

      return allJobs.map((job) => this.mapBullJobToQueuedJob(job, 'waiting'));
    } catch (error) {
      throw new Error(
        `Failed to get queued jobs: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get all scheduled (delayed) jobs
   * @returns Array of scheduled jobs
   */
  async getScheduledJobs(): Promise<QueuedJob[]> {
    try {
      const delayedJobs = await this.queue.getDelayed();

      return delayedJobs.map((job) => {
        const scheduledFor = job.opts.delay
          ? new Date(job.timestamp + job.opts.delay)
          : undefined;

        return {
          id: job.id || '',
          job: job.data,
          status: 'delayed' as const,
          scheduledFor,
          createdAt: new Date(job.timestamp),
        };
      });
    } catch (error) {
      throw new Error(
        `Failed to get scheduled jobs: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Cancel a pending or scheduled job
   * @param jobId - ID of the job to cancel
   * @returns true if job was cancelled, false if not found
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        return false;
      }

      await job.remove();
      return true;
    } catch (error) {
      console.error('Failed to cancel job:', error);
      return false;
    }
  }

  /**
   * Get the status of a specific job
   * @param jobId - ID of the job to check
   * @returns Job status information
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const job = await this.queue.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const state = await job.getState();
      const progress = job.progress as number || 0;
      const returnValue = job.returnvalue as PublishResult | undefined;

      return {
        id: job.id || '',
        state,
        progress,
        result: returnValue,
        error: job.failedReason,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts || 3,
      };
    } catch (error) {
      throw new Error(
        `Failed to get job status: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Start processing jobs with a custom handler
   * @param processor - Function to process publishing jobs
   */
  async startWorker(
    processor: (job: PublishJob) => Promise<PublishResult>
  ): Promise<void> {
    if (this.worker) {
      console.warn('Worker already started');
      return;
    }

    this.worker = new Worker<PublishJob, PublishResult>(
      this.queueName,
      async (job: Job<PublishJob>) => {
        console.log(`Processing job ${job.id}:`, job.data);

        try {
          const result = await processor(job.data);

          // Update progress to 100%
          await job.updateProgress(100);

          return result;
        } catch (error) {
          console.error(`Job ${job.id} failed:`, error);
          throw error;
        }
      },
      {
        connection: this.connection.duplicate(),
        concurrency: 5, // Process up to 5 jobs concurrently
      }
    );

    // Worker event handlers
    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error.message);
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    console.log('Publishing queue worker started');
  }

  /**
   * Stop the worker from processing new jobs
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      console.log('Publishing queue worker stopped');
    }
  }

  /**
   * Get queue metrics and statistics
   */
  async getQueueMetrics() {
    try {
      const [
        waitingCount,
        activeCount,
        completedCount,
        failedCount,
        delayedCount,
      ] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      return {
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
        delayed: delayedCount,
        total: waitingCount + activeCount + delayedCount,
      };
    } catch (error) {
      throw new Error(
        `Failed to get queue metrics: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Clear all jobs from the queue (use with caution)
   * @param status - Specific status to clear, or 'all' for everything
   */
  async clearQueue(
    status?: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'all'
  ): Promise<void> {
    try {
      if (!status || status === 'all') {
        await this.queue.drain();
        await this.queue.clean(0, 1000, 'completed');
        await this.queue.clean(0, 1000, 'failed');
      } else {
        if (status === 'completed' || status === 'failed') {
          await this.queue.clean(0, 1000, status);
        } else {
          // For waiting, active, delayed - remove jobs individually
          const jobs =
            status === 'waiting' ? await this.queue.getWaiting() :
            status === 'active' ? await this.queue.getActive() :
            await this.queue.getDelayed();

          await Promise.all(jobs.map((job) => job.remove()));
        }
      }

      console.log(`Cleared ${status || 'all'} jobs from queue`);
    } catch (error) {
      throw new Error(
        `Failed to clear queue: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Pause the queue (stop processing new jobs)
   */
  async pause(): Promise<void> {
    await this.queue.pause();
    console.log('Queue paused');
  }

  /**
   * Resume the queue (continue processing jobs)
   */
  async resume(): Promise<void> {
    await this.queue.resume();
    console.log('Queue resumed');
  }

  /**
   * Check if queue is paused
   */
  async isPaused(): Promise<boolean> {
    return this.queue.isPaused();
  }

  /**
   * Close all connections and cleanup resources
   */
  async close(): Promise<void> {
    try {
      await this.stopWorker();

      if (this.queueEvents) {
        await this.queueEvents.close();
        this.queueEvents = null;
      }

      await this.queue.close();
      await this.connection.quit();

      console.log('Publishing queue closed');
    } catch (error) {
      console.error('Error closing publishing queue:', error);
    }
  }

  /**
   * Map a BullMQ job to our QueuedJob interface
   */
  private mapBullJobToQueuedJob(
    job: Job<PublishJob>,
    defaultStatus: QueuedJob['status']
  ): QueuedJob {
    return {
      id: job.id || '',
      job: job.data,
      status: defaultStatus,
      scheduledFor: job.opts.delay
        ? new Date(job.timestamp + job.opts.delay)
        : undefined,
      createdAt: new Date(job.timestamp),
    };
  }
}
