/**
 * Events API Routes
 * Handles event listing
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/events
 * List events for a product with pagination and filtering
 * Query params: productId (required), page, limit, eventType, processed
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('eventType');
    const processed = searchParams.get('processed');

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

    if (eventType) {
      where.eventType = eventType;
    }

    if (processed !== null && processed !== undefined) {
      where.processed = processed === 'true';
    }

    // Get total count
    const total = await prisma.event.count({ where });

    // Get paginated events
    const skip = (page - 1) * limit;
    const events = await prisma.event.findMany({
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

    // Calculate stats
    const stats = {
      total,
      processed: await prisma.event.count({
        where: {
          productId,
          processed: true,
        },
      }),
      unprocessed: await prisma.event.count({
        where: {
          productId,
          processed: false,
        },
      }),
    };

    // Group by event type
    const eventTypeGroups = await prisma.event.groupBy({
      by: ['eventType'],
      where: { productId },
      _count: {
        eventType: true,
      },
      orderBy: {
        _count: {
          eventType: 'desc',
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: events,
      stats,
      eventTypes: eventTypeGroups.map((group) => ({
        eventType: group.eventType,
        count: group._count.eventType,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
