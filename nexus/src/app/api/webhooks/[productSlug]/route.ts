/**
 * Webhook Receiver Endpoint
 * Receives webhooks from external systems and triggers automations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * POST /api/webhooks/[productSlug]
 * Receive webhook from external system
 * Validates signature, creates event, and triggers matching automations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { productSlug: string } }
) {
  try {
    const { productSlug } = params;

    if (!productSlug) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product slug is required',
        },
        { status: 400 }
      );
    }

    // Get product by slug
    const product = await prisma.product.findUnique({
      where: { slug: productSlug },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }

    // Parse payload
    const payload = await request.json();

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload',
        },
        { status: 400 }
      );
    }

    // Validate webhook signature if webhookSecret is configured
    if (product.webhookSecret) {
      const signature = request.headers.get('x-webhook-signature');
      const timestamp = request.headers.get('x-webhook-timestamp');

      if (!signature) {
        return NextResponse.json(
          {
            success: false,
            error: 'Missing webhook signature',
          },
          { status: 401 }
        );
      }

      // Verify signature
      const isValid = verifyWebhookSignature(
        payload,
        product.webhookSecret,
        signature,
        timestamp
      );

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid webhook signature',
          },
          { status: 401 }
        );
      }
    }

    // Extract event type from payload
    const eventType = payload.type || payload.event || payload.eventType || 'webhook.received';

    // Create Event record
    const event = await prisma.event.create({
      data: {
        productId: product.id,
        eventType,
        payload,
        processed: false,
      },
    });

    // Find matching automations
    const automations = await prisma.automation.findMany({
      where: {
        productId: product.id,
        enabled: true,
        OR: [
          { triggerType: 'webhook' },
          { triggerType: 'event' },
        ],
      },
    });

    // Filter automations based on trigger config
    const matchingAutomations = automations.filter((automation) => {
      const config = automation.triggerConfig as any;

      // Check if automation matches this event type
      if (automation.triggerType === 'webhook') {
        if (!config.eventTypes || config.eventTypes.length === 0) {
          return true; // Match all webhook events
        }
        return config.eventTypes.includes(eventType);
      }

      if (automation.triggerType === 'event') {
        if (!config.eventType) {
          return false;
        }
        return config.eventType === eventType;
      }

      return false;
    });

    // Check conditions for each matching automation
    const triggeredAutomationIds: string[] = [];

    for (const automation of matchingAutomations) {
      const shouldTrigger = evaluateConditions(
        automation.conditions as any,
        payload
      );

      if (shouldTrigger) {
        triggeredAutomationIds.push(automation.id);
      }
    }

    // Update event with triggered automations
    await prisma.event.update({
      where: { id: event.id },
      data: {
        automationsTriggered: triggeredAutomationIds,
      },
    });

    // Trigger automations asynchronously (fire and forget)
    if (triggeredAutomationIds.length > 0) {
      // In production, this should be done via a queue/background job
      triggerAutomations(triggeredAutomationIds, event.id, payload).catch(
        (error) => {
          console.error('Error triggering automations:', error);
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          eventId: event.id,
          eventType,
          automationsTriggered: triggeredAutomationIds.length,
          message: `Webhook received and ${triggeredAutomationIds.length} automation(s) triggered`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhook',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: any,
  secret: string,
  signature: string,
  timestamp: string | null
): boolean {
  try {
    // Construct the signed payload
    const payloadString = JSON.stringify(payload);
    const signedPayload = timestamp
      ? `${timestamp}.${payloadString}`
      : payloadString;

    // Compute HMAC signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signedPayload);
    const expectedSignature = hmac.digest('hex');

    // Compare signatures (constant-time comparison)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Evaluate automation conditions against payload
 */
function evaluateConditions(conditions: any, payload: any): boolean {
  if (!conditions || typeof conditions !== 'object') {
    return true; // No conditions means always trigger
  }

  // Support multiple condition formats
  if (Array.isArray(conditions)) {
    // All conditions must match (AND logic)
    return conditions.every((condition) =>
      evaluateSingleCondition(condition, payload)
    );
  }

  if (conditions.operator === 'OR') {
    // Any condition must match (OR logic)
    return conditions.conditions.some((condition: any) =>
      evaluateSingleCondition(condition, payload)
    );
  }

  if (conditions.operator === 'AND' || !conditions.operator) {
    // All conditions must match (AND logic)
    return conditions.conditions
      ? conditions.conditions.every((condition: any) =>
          evaluateSingleCondition(condition, payload)
        )
      : evaluateSingleCondition(conditions, payload);
  }

  return true;
}

/**
 * Evaluate a single condition
 */
function evaluateSingleCondition(condition: any, payload: any): boolean {
  const { field, operator, value } = condition;

  if (!field) {
    return true;
  }

  // Get field value from payload using dot notation
  const fieldValue = getNestedValue(payload, field);

  // Evaluate based on operator
  switch (operator) {
    case 'equals':
    case '==':
      return fieldValue === value;

    case 'not_equals':
    case '!=':
      return fieldValue !== value;

    case 'contains':
      return (
        typeof fieldValue === 'string' &&
        fieldValue.includes(value)
      );

    case 'not_contains':
      return (
        typeof fieldValue === 'string' &&
        !fieldValue.includes(value)
      );

    case 'greater_than':
    case '>':
      return Number(fieldValue) > Number(value);

    case 'less_than':
    case '<':
      return Number(fieldValue) < Number(value);

    case 'greater_than_or_equal':
    case '>=':
      return Number(fieldValue) >= Number(value);

    case 'less_than_or_equal':
    case '<=':
      return Number(fieldValue) <= Number(value);

    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;

    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;

    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);

    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);

    default:
      return true;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Trigger automations asynchronously
 */
async function triggerAutomations(
  automationIds: string[],
  eventId: string,
  triggerData: any
): Promise<void> {
  const { AutomationExecutor } = await import('@/services/automation');

  const executor = new AutomationExecutor();

  for (const automationId of automationIds) {
    try {
      // Get automation with all details
      const automation = await prisma.automation.findUnique({
        where: { id: automationId },
      });

      if (!automation) {
        continue;
      }

      // Update last triggered timestamp and count
      await prisma.automation.update({
        where: { id: automationId },
        data: {
          lastTriggered: new Date(),
          triggerCount: { increment: 1 },
        },
      });

      // Execute automation
      await executor.executeAutomation(automation, {
        eventId,
        ...triggerData,
      });
    } catch (error) {
      console.error(
        `Error executing automation ${automationId}:`,
        error
      );
    }
  }

  // Mark event as processed
  await prisma.event.update({
    where: { id: eventId },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  });
}
