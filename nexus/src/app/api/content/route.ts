/**
 * Content API Routes
 * Handles content listing and creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/content
 * List content for a product with pagination
 * Query params: productId (required), page, limit, status, contentType
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productId = searchParams.get('productId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const contentType = searchParams.get('contentType');

    // Validate productId
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = {
      productId,
    };

    if (status) {
      where.status = status;
    }

    if (contentType) {
      where.contentType = contentType;
    }

    // Get total count
    const total = await prisma.content.count({ where });

    // Get paginated content
    const skip = (page - 1) * limit;
    const content = await prisma.content.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        publications: {
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            publishedAt: true,
            channelId: true,
          },
        },
        _count: {
          select: {
            publications: true,
          },
        },
      },
    });

    return NextResponse.json({
      content,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content
 * Create new content
 * Body: { productId, originalText, contentType, status, templateId?, media?, aiGenerated?, aiPrompt?, aiModel?, predictions? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      originalText,
      contentType = 'post',
      status = 'draft',
      templateId,
      media,
      aiGenerated = false,
      aiPrompt,
      aiModel,
      predictions,
      adapted,
    } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    if (!originalText || originalText.trim() === '') {
      return NextResponse.json(
        { error: 'originalText is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Verify template exists if provided
    if (templateId) {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
    }

    // Validate status
    const validStatuses = ['draft', 'ready', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Create content
    const content = await prisma.content.create({
      data: {
        productId,
        originalText,
        contentType,
        status,
        templateId: templateId || null,
        media: media || null,
        aiGenerated,
        aiPrompt: aiPrompt || null,
        aiModel: aiModel || null,
        predictions: predictions || null,
        adapted: adapted || null,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        publications: true,
      },
    });

    return NextResponse.json(content, { status: 201 });
  } catch (error) {
    console.error('Error creating content:', error);

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid productId or templateId' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
