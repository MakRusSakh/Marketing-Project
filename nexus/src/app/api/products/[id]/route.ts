import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/products/[id] - Get product by ID
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
      include: {
        channels: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            channels: true,
            contents: true,
            automations: true,
            templates: true,
          },
        },
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
      data: product,
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] - Update product
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
    const updateData: Prisma.ProductUpdateInput = {};

    // Validate and add name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Name must be a non-empty string',
          },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    // Validate and add slug if provided
    if (body.slug !== undefined) {
      if (typeof body.slug !== 'string' || body.slug.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Slug must be a non-empty string',
          },
          { status: 400 }
        );
      }

      const slugRegex = /^[a-z0-9-]+$/;
      const normalizedSlug = body.slug.trim().toLowerCase();
      if (!slugRegex.test(normalizedSlug)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Slug must contain only lowercase letters, numbers, and hyphens',
          },
          { status: 400 }
        );
      }
      updateData.slug = normalizedSlug;
    }

    // Validate and add description if provided
    if (body.description !== undefined) {
      if (body.description === null) {
        updateData.description = null;
      } else if (typeof body.description === 'string') {
        updateData.description = body.description.trim();
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Description must be a string or null',
          },
          { status: 400 }
        );
      }
    }

    // Validate and add brandVoice if provided
    if (body.brandVoice !== undefined) {
      if (body.brandVoice === null) {
        updateData.brandVoice = null;
      } else if (typeof body.brandVoice === 'object') {
        updateData.brandVoice = body.brandVoice;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Brand voice must be an object or null',
          },
          { status: 400 }
        );
      }
    }

    // Validate and add settings if provided
    if (body.settings !== undefined) {
      if (body.settings === null) {
        updateData.settings = null;
      } else if (typeof body.settings === 'object') {
        updateData.settings = body.settings;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Settings must be an object or null',
          },
          { status: 400 }
        );
      }
    }

    // Validate and add webhookSecret if provided
    if (body.webhookSecret !== undefined) {
      if (body.webhookSecret === null) {
        updateData.webhookSecret = null;
      } else if (typeof body.webhookSecret === 'string') {
        updateData.webhookSecret = body.webhookSecret;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Webhook secret must be a string or null',
          },
          { status: 400 }
        );
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          message: 'No valid fields to update',
        },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        channels: true,
        _count: {
          select: {
            channels: true,
            contents: true,
            automations: true,
            templates: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error) {
    console.error('Error updating product:', error);

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
      // Handle unique constraint violation
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
        error: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Delete the product (cascade will handle related records)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting product:', error);

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
        error: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
