import { Worker, Job, Queue } from "bullmq";
import { prisma } from "@/lib/prisma";
import IORedis from "ioredis";

// Automation processor worker processes webhook events from the queue
// and executes matching automations

interface AutomationJobData {
  eventId: string;
}

interface ActionResult {
  action: string;
  success: boolean;
  result?: any;
  error?: string;
}

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null,
});

// Create queues for various actions
const publishQueue = new Queue("publish-queue", { connection });

// Evaluate conditions against event payload
function evaluateConditions(conditions: any, payload: any): boolean {
  if (!conditions || Object.keys(conditions).length === 0) {
    return true; // No conditions means always match
  }

  try {
    // Simple condition evaluation
    // Supports: equals, contains, greaterThan, lessThan, exists
    for (const [field, condition] of Object.entries(conditions)) {
      const value = getNestedValue(payload, field);

      if (typeof condition === "object" && condition !== null) {
        const conditionObj = condition as any;

        if ("equals" in conditionObj && value !== conditionObj.equals) {
          return false;
        }

        if ("contains" in conditionObj) {
          if (
            typeof value !== "string" ||
            !value.includes(conditionObj.contains)
          ) {
            return false;
          }
        }

        if ("greaterThan" in conditionObj && value <= conditionObj.greaterThan) {
          return false;
        }

        if ("lessThan" in conditionObj && value >= conditionObj.lessThan) {
          return false;
        }

        if ("exists" in conditionObj) {
          const exists = value !== undefined && value !== null;
          if (exists !== conditionObj.exists) {
            return false;
          }
        }
      } else {
        // Simple equality check
        if (value !== condition) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error("Error evaluating conditions:", error);
    return false;
  }
}

// Get nested value from object using dot notation (e.g., "user.email")
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Execute a single action
async function executeAction(
  action: any,
  event: any,
  productId: string
): Promise<ActionResult> {
  const actionType = action.type;

  console.log(`[Automation Processor] Executing action: ${actionType}`);

  try {
    switch (actionType) {
      case "generate_content": {
        // Generate content using AI
        const prompt = action.prompt || event.payload.prompt || "Generate a social media post";

        const content = await prisma.content.create({
          data: {
            productId,
            originalText: "", // Will be filled by AI
            aiGenerated: true,
            aiPrompt: prompt,
            aiModel: action.model || "claude-3-5-sonnet-20241022",
            status: "draft",
          },
        });

        // In a real implementation, this would call the AI service
        // For now, we just create the record
        console.log(`[Automation Processor] Created content ${content.id}`);

        return {
          action: actionType,
          success: true,
          result: { contentId: content.id },
        };
      }

      case "publish_content": {
        // Publish existing content to channels
        const contentId = action.contentId || event.payload.contentId;
        const channelIds = action.channelIds || event.payload.channelIds || [];

        if (!contentId) {
          throw new Error("contentId is required for publish_content action");
        }

        const publications = [];

        for (const channelId of channelIds) {
          const publication = await prisma.publication.create({
            data: {
              contentId,
              channelId,
              status: "scheduled",
              scheduledAt: action.scheduleAt
                ? new Date(action.scheduleAt)
                : new Date(),
            },
          });

          // Queue for immediate publishing if scheduled for now
          if (!action.scheduleAt || new Date(action.scheduleAt) <= new Date()) {
            await publishQueue.add("publish", {
              publicationId: publication.id,
            });
          }

          publications.push(publication.id);
        }

        console.log(
          `[Automation Processor] Created ${publications.length} publications`
        );

        return {
          action: actionType,
          success: true,
          result: { publicationIds: publications },
        };
      }

      case "send_notification": {
        // Send a notification (email, webhook, etc.)
        const notificationType = action.notificationType || "email";
        const recipient = action.recipient || event.payload.recipient;
        const message = action.message || event.payload.message;

        // In a real implementation, this would send actual notifications
        console.log(
          `[Automation Processor] Sending ${notificationType} notification to ${recipient}`
        );

        return {
          action: actionType,
          success: true,
          result: { type: notificationType, recipient },
        };
      }

      case "webhook": {
        // Call an external webhook
        const url = action.url;
        const method = action.method || "POST";
        const payload = action.payload || event.payload;

        // In a real implementation, this would make an HTTP request
        console.log(`[Automation Processor] Calling webhook: ${method} ${url}`);

        return {
          action: actionType,
          success: true,
          result: { url, method },
        };
      }

      case "create_draft": {
        // Create a draft post
        const text = action.text || event.payload.text || "";

        const content = await prisma.content.create({
          data: {
            productId,
            originalText: text,
            aiGenerated: false,
            status: "draft",
          },
        });

        console.log(`[Automation Processor] Created draft ${content.id}`);

        return {
          action: actionType,
          success: true,
          result: { contentId: content.id },
        };
      }

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  } catch (error: any) {
    console.error(`[Automation Processor] Error executing action:`, error);
    return {
      action: actionType,
      success: false,
      error: error.message || "Unknown error",
    };
  }
}

// Process a single automation event
async function processAutomationEvent(job: Job<AutomationJobData>) {
  const { eventId } = job.data;

  console.log(`[Automation Processor] Processing event ${eventId}`);

  try {
    // Fetch the event
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        product: {
          include: {
            automations: {
              where: {
                enabled: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    if (event.processed) {
      console.log(`[Automation Processor] Event ${eventId} already processed`);
      return { alreadyProcessed: true };
    }

    console.log(
      `[Automation Processor] Found ${event.product.automations.length} enabled automations`
    );

    const triggeredAutomations: string[] = [];
    const automationLogs: any[] = [];

    // Find matching automations
    for (const automation of event.product.automations) {
      // Check if automation should be triggered by this event
      const triggerConfig = automation.triggerConfig as any;

      if (automation.triggerType === "webhook") {
        // Check if event type matches
        const eventTypeMatch =
          !triggerConfig.eventType || triggerConfig.eventType === event.eventType;

        if (!eventTypeMatch) {
          continue;
        }

        // Evaluate conditions
        const conditionsMatch = evaluateConditions(
          automation.conditions,
          event.payload
        );

        if (!conditionsMatch) {
          console.log(
            `[Automation Processor] Automation ${automation.id} conditions not met`
          );
          continue;
        }

        // Execute automation
        console.log(
          `[Automation Processor] Triggering automation ${automation.id} - ${automation.name}`
        );

        const logStartTime = new Date();
        const executedActions: ActionResult[] = [];

        try {
          const actions = automation.actions as any[];

          for (const action of actions) {
            const result = await executeAction(action, event, event.productId);
            executedActions.push(result);

            if (!result.success && action.required) {
              throw new Error(
                `Required action ${action.type} failed: ${result.error}`
              );
            }
          }

          // Create success log
          const log = await prisma.automationLog.create({
            data: {
              automationId: automation.id,
              eventId: event.id,
              status: "success",
              startedAt: logStartTime,
              completedAt: new Date(),
              actionsExecuted: executedActions,
              triggerData: event.payload,
            },
          });

          automationLogs.push(log.id);
          triggeredAutomations.push(automation.id);

          // Update automation trigger count and last triggered time
          await prisma.automation.update({
            where: { id: automation.id },
            data: {
              triggerCount: { increment: 1 },
              lastTriggered: new Date(),
            },
          });

          console.log(
            `[Automation Processor] Automation ${automation.id} completed successfully`
          );
        } catch (error: any) {
          console.error(
            `[Automation Processor] Automation ${automation.id} failed:`,
            error
          );

          // Create failure log
          await prisma.automationLog.create({
            data: {
              automationId: automation.id,
              eventId: event.id,
              status: "failed",
              startedAt: logStartTime,
              completedAt: new Date(),
              actionsExecuted: executedActions,
              errorMessage: error.message || "Unknown error",
              triggerData: event.payload,
            },
          });
        }
      }
    }

    // Mark event as processed
    await prisma.event.update({
      where: { id: eventId },
      data: {
        processed: true,
        processedAt: new Date(),
        automationsTriggered: triggeredAutomations,
        result: {
          automationsTriggered: triggeredAutomations.length,
          logs: automationLogs,
        },
      },
    });

    console.log(
      `[Automation Processor] Event ${eventId} processed: ${triggeredAutomations.length} automations triggered`
    );

    return {
      eventId,
      automationsTriggered: triggeredAutomations.length,
      logs: automationLogs,
    };
  } catch (error) {
    console.error(`[Automation Processor] Error processing event ${eventId}:`, error);
    throw error;
  }
}

// Create the automation processor worker
export function createAutomationProcessorWorker() {
  const worker = new Worker<AutomationJobData>(
    "automation-queue",
    async (job) => {
      return processAutomationEvent(job);
    },
    {
      connection,
      concurrency: 3, // Process up to 3 automation events concurrently
    }
  );

  // Event handlers
  worker.on("completed", (job, result) => {
    console.log(
      `[Automation Processor] Job ${job.id} completed: ${result.automationsTriggered || 0} automations triggered`
    );
  });

  worker.on("failed", (job, err) => {
    console.error(`[Automation Processor] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[Automation Processor] Worker error:", err);
  });

  worker.on("ready", () => {
    console.log("[Automation Processor] Worker is ready and waiting for events");
  });

  return worker;
}

export default createAutomationProcessorWorker;
