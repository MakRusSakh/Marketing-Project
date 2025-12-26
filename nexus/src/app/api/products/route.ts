import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/products - List all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const search = searchParams.get('search');

    const where: Prisma.ProductWhereInput = {};

    // Add search filter if provided
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          channels: {
            select: {
              id: true,
              platform: true,
              platformName: true,
              status: true,
            },
          },
          _count: {
            select: {
              channels: true,
              contents: true,
              automations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit) : undefined,
        skip: offset ? parseInt(offset) : undefined,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: products,
      meta: {
        total,
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Product name is required and must be a string',
        },
        { status: 400 }
      );
    }

    if (!body.slug || typeof body.slug !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Product slug is required and must be a string',
        },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(body.slug)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Slug must contain only lowercase letters, numbers, and hyphens',
        },
        { status: 400 }
      );
    }

    // Validate description if provided
    if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Description must be a string',
        },
        { status: 400 }
      );
    }

    // Validate brandVoice if provided
    if (body.brandVoice !== undefined && body.brandVoice !== null) {
      if (typeof body.brandVoice !== 'object') {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Brand voice must be an object',
          },
          { status: 400 }
        );
      }
    }

    // Create the product
    const product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim().toLowerCase(),
        description: body.description?.trim() || null,
        brandVoice: body.brandVoice || null,
        settings: body.settings || null,
      },
      include: {
        channels: true,
        _count: {
          select: {
            channels: true,
            contents: true,
            automations: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: product,
        message: 'Product created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);

    // Handle unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          {
            success: false,
            error: 'Conflict',
            message: 'A product with this slug already exists',
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
