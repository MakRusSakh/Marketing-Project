/**
 * Automations API Routes
 * Handles automation listing and creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/automations
 * List automations for a product with pagination
 * Query params: productId (required), page, limit, enabled, triggerType
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const enabled = searchParams.get('enabled');
    const triggerType = searchParams.get('triggerType');

    // Validate productId
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'productId is required',
        },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    // Build where clause
    const where: any = {
      productId,
    };

    if (enabled !== null && enabled !== undefined) {
      where.enabled = enabled === 'true';
    }

    if (triggerType) {
      where.triggerType = triggerType;
    }

    // Get total count
    const total = await prisma.automation.count({ where });

    // Get paginated automations
    const skip = (page - 1) * limit;
    const automations = await prisma.automation.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
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
      data: automations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch automations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/automations
 * Create new automation
 * Body: { productId, name, description?, triggerType, triggerConfig, conditions?, actions, enabled? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      name,
      description,
      triggerType,
      triggerConfig,
      conditions,
      actions,
      enabled = true,
    } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: 'productId is required',
        },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'name is required and cannot be empty',
        },
        { status: 400 }
      );
    }

    if (!triggerType) {
      return NextResponse.json(
        {
          success: false,
          error: 'triggerType is required',
        },
        { status: 400 }
      );
    }

    // Validate trigger type
    const validTriggerTypes = ['webhook', 'schedule', 'manual', 'event'];
    if (!validTriggerTypes.includes(triggerType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid triggerType. Must be one of: ${validTriggerTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!triggerConfig || typeof triggerConfig !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'triggerConfig is required and must be an object',
        },
        { status: 400 }
      );
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'actions is required and must be a non-empty array',
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

    for (const action of actions) {
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

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    // Validate trigger config based on trigger type
    const configValidation = validateTriggerConfig(triggerType, triggerConfig);
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: configValidation.error,
        },
        { status: 400 }
      );
    }

    // Create automation
    const automation = await prisma.automation.create({
      data: {
        productId,
        name: name.trim(),
        description: description?.trim() || null,
        triggerType,
        triggerConfig,
        conditions: conditions || null,
        actions,
        enabled,
      },
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

    return NextResponse.json(
      {
        success: true,
        data: automation,
        message: 'Automation created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating automation:', error);

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid productId',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create automation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Validate trigger config based on trigger type
 */
function validateTriggerConfig(
  triggerType: string,
  config: any
): { valid: boolean; error?: string } {
  switch (triggerType) {
    case 'webhook':
      // Webhook config can have optional eventTypes array
      if (config.eventTypes && !Array.isArray(config.eventTypes)) {
        return {
          valid: false,
          error: 'triggerConfig.eventTypes must be an array',
        };
      }
      return { valid: true };

    case 'schedule':
      // Schedule config must have cron expression or interval
      if (!config.cron && !config.interval) {
        return {
          valid: false,
          error: 'triggerConfig must have either cron or interval',
        };
      }

      if (config.cron && typeof config.cron !== 'string') {
        return {
          valid: false,
          error: 'triggerConfig.cron must be a string',
        };
      }

      if (config.interval && typeof config.interval !== 'number') {
        return {
          valid: false,
          error: 'triggerConfig.interval must be a number',
        };
      }

      return { valid: true };

    case 'event':
      // Event config must have eventType
      if (!config.eventType || typeof config.eventType !== 'string') {
        return {
          valid: false,
          error: 'triggerConfig.eventType is required and must be a string',
        };
      }
      return { valid: true };

    case 'manual':
      // Manual trigger has no specific config requirements
      return { valid: true };

    default:
      return {
        valid: false,
        error: `Unknown trigger type: ${triggerType}`,
      };
  }
}
