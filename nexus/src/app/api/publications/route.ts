/**
 * Publications API Routes
 * Handles listing publications with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/publications
 * List publications with optional filtering
 * Query params: status, channelId, contentId, productId, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const channelId = searchParams.get('channelId');
    const contentId = searchParams.get('contentId');
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build where clause
    const where: any = {};

    if (status) {
      // Allow multiple statuses separated by comma
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = {
          in: statuses,
        };
      }
    }

    if (channelId) {
      where.channelId = channelId;
    }

    if (contentId) {
      where.contentId = contentId;
    }

    // If filtering by productId, we need to join through content or channel
    if (productId) {
      where.content = {
        productId,
      };
    }

    // Get total count
    const total = await prisma.publication.count({ where });

    // Get paginated publications
    const skip = (page - 1) * limit;
    const publications = await prisma.publication.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { scheduledAt: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        content: {
          select: {
            id: true,
            originalText: true,
            contentType: true,
            productId: true,
          },
        },
        channel: {
          select: {
            id: true,
            platform: true,
            platformName: true,
            productId: true,
          },
        },
      },
    });

    // Calculate additional metadata
    const publicationsWithMetadata = publications.map(pub => {
      const metadata: any = {
        isScheduled: !!pub.scheduledAt,
        isPublished: pub.status === 'published',
        isFailed: pub.status === 'failed',
      };

      if (pub.scheduledAt) {
        const now = new Date();
        const scheduled = new Date(pub.scheduledAt);
        metadata.timeUntilPublish = Math.max(0, scheduled.getTime() - now.getTime());
        metadata.isPastDue = pub.status === 'scheduled' && scheduled.getTime() < now.getTime();
      }

      if (pub.publishedAt) {
        metadata.timeSincePublish = Date.now() - new Date(pub.publishedAt).getTime();
      }

      return {
        ...pub,
        metadata,
      };
    });

    // Get status counts if no specific status filter
    let statusCounts = undefined;
    if (!status) {
      const counts = await prisma.publication.groupBy({
        by: ['status'],
        where: productId ? { content: { productId } } : {},
        _count: {
          status: true,
        },
      });

      statusCounts = counts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {} as Record<string, number>);
    }

    return NextResponse.json({
      publications: publicationsWithMetadata,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts,
    });
  } catch (error) {
    console.error('Error fetching publications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
