/**
 * Single Content API Routes
 * Handles operations on individual content items
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/content/[id]
 * Get a single content item with publications
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            brandVoice: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        publications: {
          include: {
            channel: {
              select: {
                id: true,
                platform: true,
                platformName: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/content/[id]
 * Update a content item
 * Body: { originalText?, contentType?, status?, adapted?, media?, predictions?, templateId? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Check if content exists
    const existingContent = await prisma.content.findUnique({
      where: { id },
    });

    if (!existingContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Build update data object
    const updateData: any = {};

    if (body.originalText !== undefined) {
      if (typeof body.originalText !== 'string' || body.originalText.trim() === '') {
        return NextResponse.json(
          { error: 'originalText must be a non-empty string' },
          { status: 400 }
        );
      }
      updateData.originalText = body.originalText;
    }

    if (body.contentType !== undefined) {
      updateData.contentType = body.contentType;
    }

    if (body.status !== undefined) {
      const validStatuses = ['draft', 'ready', 'published', 'archived'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    if (body.adapted !== undefined) {
      updateData.adapted = body.adapted;
    }

    if (body.media !== undefined) {
      updateData.media = body.media;
    }

    if (body.predictions !== undefined) {
      updateData.predictions = body.predictions;
    }

    if (body.templateId !== undefined) {
      if (body.templateId === null) {
        updateData.templateId = null;
      } else {
        // Verify template exists
        const template = await prisma.template.findUnique({
          where: { id: body.templateId },
        });

        if (!template) {
          return NextResponse.json(
            { error: 'Template not found' },
            { status: 404 }
          );
        }
        updateData.templateId = body.templateId;
      }
    }

    // Update content
    const content = await prisma.content.update({
      where: { id },
      data: updateData,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        publications: {
          include: {
            channel: {
              select: {
                id: true,
                platform: true,
                platformName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(content);
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content/[id]
 * Delete a content item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if content exists
    const existingContent = await prisma.content.findUnique({
      where: { id },
      include: {
        publications: {
          where: {
            status: {
              in: ['scheduled', 'publishing', 'published'],
            },
          },
        },
      },
    });

    if (!existingContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check if there are active publications
    if (existingContent.publications.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete content with active or published publications',
          activePublications: existingContent.publications.length,
        },
        { status: 409 }
      );
    }

    // Delete the content (publications will cascade delete)
    await prisma.content.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
