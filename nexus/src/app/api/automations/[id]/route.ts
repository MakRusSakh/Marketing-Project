/**
 * Single Automation API Routes
 * Handles individual automation operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AutomationExecutor } from '@/services/automation';

/**
 * GET /api/automations/[id]
 * Get automation details with logs
 * Query params: includeLogs (boolean), logsLimit (number)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeLogs = searchParams.get('includeLogs') === 'true';
    const logsLimit = parseInt(searchParams.get('logsLimit') || '50');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation ID is required',
        },
        { status: 400 }
      );
    }

    // Get automation
    const automation = await prisma.automation.findUnique({
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

    if (!automation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation not found',
        },
        { status: 404 }
      );
    }

    // Get logs if requested
    let logs = null;
    if (includeLogs) {
      logs = await prisma.automationLog.findMany({
        where: { automationId: id },
        take: logsLimit,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              eventType: true,
              createdAt: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...automation,
        logs: logs || undefined,
      },
    });
  } catch (error) {
    console.error('Error fetching automation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch automation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/automations/[id]
 * Update automation
 * Body: { name?, description?, triggerType?, triggerConfig?, conditions?, actions?, enabled? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation ID is required',
        },
        { status: 400 }
      );
    }

    // Check if automation exists
    const existingAutomation = await prisma.automation.findUnique({
      where: { id },
    });

    if (!existingAutomation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation not found',
        },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'name must be a non-empty string',
          },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.triggerType !== undefined) {
      const validTriggerTypes = ['webhook', 'schedule', 'manual', 'event'];
      if (!validTriggerTypes.includes(body.triggerType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid triggerType. Must be one of: ${validTriggerTypes.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.triggerType = body.triggerType;
    }

    if (body.triggerConfig !== undefined) {
      if (typeof body.triggerConfig !== 'object') {
        return NextResponse.json(
          {
            success: false,
            error: 'triggerConfig must be an object',
          },
          { status: 400 }
        );
      }
      updateData.triggerConfig = body.triggerConfig;
    }

    if (body.conditions !== undefined) {
      updateData.conditions = body.conditions;
    }

    if (body.actions !== undefined) {
      if (!Array.isArray(body.actions) || body.actions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'actions must be a non-empty array',
          },
          { status: 400 }
        );
      }

      // Validate actions
      const validActionTypes = [
        'generate_content',
        'publish',
        'schedule',
        'notify',
        'adapt_content',
      ];

      for (const action of body.actions) {
        if (!action.type || !validActionTypes.includes(action.type)) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid action type. Must be one of: ${validActionTypes.join(', ')}`,
            },
            { status: 400 }
          );
        }

        if (!action.config || typeof action.config !== 'object') {
          return NextResponse.json(
            {
              success: false,
              error: 'Each action must have a config object',
            },
            { status: 400 }
          );
        }
      }

      updateData.actions = body.actions;
    }

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== 'boolean') {
        return NextResponse.json(
          {
            success: false,
            error: 'enabled must be a boolean',
          },
          { status: 400 }
        );
      }
      updateData.enabled = body.enabled;
    }

    // Update automation
    const automation = await prisma.automation.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      success: true,
      data: automation,
      message: 'Automation updated successfully',
    });
  } catch (error) {
    console.error('Error updating automation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update automation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/automations/[id]
 * Delete automation
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation ID is required',
        },
        { status: 400 }
      );
    }

    // Check if automation exists
    const automation = await prisma.automation.findUnique({
      where: { id },
    });

    if (!automation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation not found',
        },
        { status: 404 }
      );
    }

    // Delete automation (logs will be cascade deleted)
    await prisma.automation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Automation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting automation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete automation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automations/[id]/trigger
 * Manually trigger automation
 * Body: { triggerData?: any }
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
          error: 'Automation ID is required',
        },
        { status: 400 }
      );
    }

    // Get automation
    const automation = await prisma.automation.findUnique({
      where: { id },
    });

    if (!automation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation not found',
        },
        { status: 404 }
      );
    }

    if (!automation.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Automation is disabled',
        },
        { status: 400 }
      );
    }

    // Parse trigger data from request body
    const body = await request.json().catch(() => ({}));
    const triggerData = body.triggerData || {};

    // Update automation trigger info
    await prisma.automation.update({
      where: { id },
      data: {
        lastTriggered: new Date(),
        triggerCount: { increment: 1 },
      },
    });

    // Execute automation
    const executor = new AutomationExecutor();
    const result = await executor.executeAutomation(automation, {
      manual: true,
      triggeredAt: new Date().toISOString(),
      ...triggerData,
    });

    return NextResponse.json({
      success: true,
      data: {
        executionId: result.logId,
        status: result.status,
        actionsExecuted: result.actionsExecuted,
        message: 'Automation triggered successfully',
      },
    });
  } catch (error) {
    console.error('Error triggering automation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to trigger automation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
