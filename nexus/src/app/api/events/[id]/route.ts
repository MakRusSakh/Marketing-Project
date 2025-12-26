/**
 * Single Event API Routes
 * Handles individual event operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AutomationExecutor } from '@/services/automation';

/**
 * GET /api/events/[id]
 * Get event details with logs
 * Query params: includeLogs (boolean)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeLogs = searchParams.get('includeLogs') === 'true';

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            automationLogs: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    // Get logs if requested
    let logs = null;
    if (includeLogs) {
      logs = await prisma.automationLog.findMany({
        where: { eventId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          automation: {
            select: {
              id: true,
              name: true,
              triggerType: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...event,
        logs: logs || undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/[id]/process
 * Manually process event (re-run automations)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event ID is required',
        },
        { status: 400 }
      );
    }

    // Get event
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: 'Event not found',
        },
        { status: 404 }
      );
    }

    // Find matching automations
    const automations = await prisma.automation.findMany({
      where: {
        productId: event.productId,
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
        return config.eventTypes.includes(event.eventType);
      }

      if (automation.triggerType === 'event') {
        if (!config.eventType) {
          return false;
        }
        return config.eventType === event.eventType;
      }

      return false;
    });

    // Check conditions for each matching automation
    const triggeredAutomationIds: string[] = [];
    const executionResults: any[] = [];

    const executor = new AutomationExecutor();

    for (const automation of matchingAutomations) {
      const shouldTrigger = evaluateConditions(
        automation.conditions as any,
        event.payload
      );

      if (shouldTrigger) {
        triggeredAutomationIds.push(automation.id);

        try {
          // Update automation trigger info
          await prisma.automation.update({
            where: { id: automation.id },
            data: {
              lastTriggered: new Date(),
              triggerCount: { increment: 1 },
            },
          });

          // Execute automation
          const result = await executor.executeAutomation(automation, {
            eventId: event.id,
            reprocessed: true,
            ...(event.payload as any),
          });

          executionResults.push({
            automationId: automation.id,
            automationName: automation.name,
            status: result.status,
            actionsExecuted: result.actionsExecuted,
          });
        } catch (error) {
          console.error(
            `Error executing automation ${automation.id}:`,
            error
          );
          executionResults.push({
            automationId: automation.id,
            automationName: automation.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    // Update event
    await prisma.event.update({
      where: { id },
      data: {
        processed: true,
        processedAt: new Date(),
        automationsTriggered: triggeredAutomationIds,
        result: {
          reprocessed: true,
          reprocessedAt: new Date().toISOString(),
          executionResults,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        eventId: event.id,
        automationsTriggered: triggeredAutomationIds.length,
        executionResults,
        message: `Event processed and ${triggeredAutomationIds.length} automation(s) executed`,
      },
    });
  } catch (error) {
    console.error('Error processing event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
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
