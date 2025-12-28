import { Worker } from "bullmq";
import { createPublisherWorker } from "./publisher-worker";
import { createSchedulerWorker, setupSchedulerJob } from "./scheduler-worker";
import { createAutomationProcessorWorker } from "./automation-processor";

// Export individual worker creators
export { createPublisherWorker } from "./publisher-worker";
export { createSchedulerWorker, setupSchedulerJob } from "./scheduler-worker";
export { createAutomationProcessorWorker } from "./automation-processor";

// Store active workers
let workers: Worker[] = [];
let isRunning = false;

/**
 * Start all background workers
 * This should be called when your application starts
 */
export async function startWorkers() {
  if (isRunning) {
    console.log("[Workers] Workers are already running");
    return workers;
  }

  console.log("[Workers] Starting all background workers...");

  try {
    // Create and start publisher worker
    console.log("[Workers] Starting publisher worker...");
    const publisherWorker = createPublisherWorker();
    workers.push(publisherWorker);

    // Create and start scheduler worker
    console.log("[Workers] Starting scheduler worker...");
    const schedulerWorker = createSchedulerWorker();
    workers.push(schedulerWorker);

    // Setup recurring scheduler job
    console.log("[Workers] Setting up recurring scheduler job...");
    await setupSchedulerJob();

    // Create and start automation processor worker
    console.log("[Workers] Starting automation processor worker...");
    const automationWorker = createAutomationProcessorWorker();
    workers.push(automationWorker);

    isRunning = true;

    console.log("[Workers] All workers started successfully");
    console.log(`[Workers] Active workers: ${workers.length}`);

    return workers;
  } catch (error) {
    console.error("[Workers] Error starting workers:", error);
    throw error;
  }
}

/**
 * Stop all background workers gracefully
 * This should be called when your application shuts down
 */
export async function stopWorkers() {
  if (!isRunning) {
    console.log("[Workers] Workers are not running");
    return;
  }

  console.log("[Workers] Stopping all background workers...");

  try {
    // Close all workers
    await Promise.all(
      workers.map(async (worker) => {
        console.log(`[Workers] Closing worker: ${worker.name}`);
        await worker.close();
      })
    );

    workers = [];
    isRunning = false;

    console.log("[Workers] All workers stopped successfully");
  } catch (error) {
    console.error("[Workers] Error stopping workers:", error);
    throw error;
  }
}

/**
 * Get the status of all workers
 */
export function getWorkerStatus() {
  return {
    isRunning,
    workers: workers.map((worker) => ({
      name: worker.name,
      isRunning: worker.isRunning(),
      isPaused: worker.isPaused(),
    })),
  };
}

/**
 * Pause all workers
 * Workers will not process new jobs but will complete current jobs
 */
export async function pauseWorkers() {
  console.log("[Workers] Pausing all workers...");

  try {
    await Promise.all(
      workers.map(async (worker) => {
        if (!worker.isPaused()) {
          await worker.pause();
          console.log(`[Workers] Paused worker: ${worker.name}`);
        }
      })
    );

    console.log("[Workers] All workers paused");
  } catch (error) {
    console.error("[Workers] Error pausing workers:", error);
    throw error;
  }
}

/**
 * Resume all paused workers
 */
export async function resumeWorkers() {
  console.log("[Workers] Resuming all workers...");

  try {
    await Promise.all(
      workers.map(async (worker) => {
        if (worker.isPaused()) {
          await worker.resume();
          console.log(`[Workers] Resumed worker: ${worker.name}`);
        }
      })
    );

    console.log("[Workers] All workers resumed");
  } catch (error) {
    console.error("[Workers] Error resuming workers:", error);
    throw error;
  }
}

// Handle graceful shutdown on process termination
if (typeof process !== "undefined") {
  process.on("SIGTERM", async () => {
    console.log("[Workers] Received SIGTERM signal");
    await stopWorkers();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("[Workers] Received SIGINT signal");
    await stopWorkers();
    process.exit(0);
  });
}

// Default export
export default {
  startWorkers,
  stopWorkers,
  pauseWorkers,
  resumeWorkers,
  getWorkerStatus,
};
