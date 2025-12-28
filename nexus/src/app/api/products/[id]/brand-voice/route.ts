import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/products/[id]/brand-voice - Get product brand voice
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        brandVoice: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'Product not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        brandVoice: product.brandVoice,
        updatedAt: product.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching brand voice:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch brand voice',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id]/brand-voice - Update product brand voice
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Invalid product ID format',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate brandVoice
    if (body.brandVoice === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Brand voice data is required',
        },
        { status: 400 }
      );
    }

    if (body.brandVoice !== null && typeof body.brandVoice !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'Brand voice must be an object or null',
        },
        { status: 400 }
      );
    }

    // Common brand voice fields validation (if provided)
    if (body.brandVoice && typeof body.brandVoice === 'object') {
      const validFields = [
        'tone',
        'style',
        'voice',
        'personality',
        'keywords',
        'avoid',
        'examples',
        'guidelines',
        'audience',
        'industry',
        'values',
        'messaging',
      ];

      // Check for tone field
      if (body.brandVoice.tone !== undefined) {
        if (typeof body.brandVoice.tone !== 'string' && !Array.isArray(body.brandVoice.tone)) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation error',
              message: 'Brand voice tone must be a string or array',
            },
            { status: 400 }
          );
        }
      }

      // Check for keywords/avoid arrays
      if (body.brandVoice.keywords !== undefined && !Array.isArray(body.brandVoice.keywords)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Keywords must be an array',
          },
          { status: 400 }
        );
      }

      if (body.brandVoice.avoid !== undefined && !Array.isArray(body.brandVoice.avoid)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Avoid list must be an array',
          },
          { status: 400 }
        );
      }
    }

    // Update the product's brand voice
    const product = await prisma.product.update({
      where: { id },
      data: {
        brandVoice: body.brandVoice,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        brandVoice: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        brandVoice: product.brandVoice,
        updatedAt: product.updatedAt,
      },
      message: 'Brand voice updated successfully',
    });
  } catch (error) {
    console.error('Error updating brand voice:', error);

    // Handle not found error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'Product not found',
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update brand voice',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
