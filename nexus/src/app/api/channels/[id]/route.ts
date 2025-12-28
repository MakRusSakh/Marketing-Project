import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/channels/[id] - Get channel by ID
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
          message: 'Invalid channel ID format',
        },
        { status: 400 }
      );
    }

    const channel = await prisma.channel.findUnique({
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
            publications: true,
          },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'Channel not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: channel,
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch channel',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT /api/channels/[id] - Update channel
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
          message: 'Invalid channel ID format',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updateData: Prisma.ChannelUpdateInput = {};

    // Validate and add credentials if provided
    if (body.credentials !== undefined) {
      if (typeof body.credentials !== 'object' || body.credentials === null) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Credentials must be an object',
          },
          { status: 400 }
        );
      }
      updateData.credentials = body.credentials;
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

    // Validate and add platformName if provided
    if (body.platformName !== undefined) {
      if (body.platformName === null) {
        updateData.platformName = null;
      } else if (typeof body.platformName === 'string') {
        updateData.platformName = body.platformName.trim();
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Platform name must be a string or null',
          },
          { status: 400 }
        );
      }
    }

    // Validate and add status if provided
    if (body.status !== undefined) {
      const validStatuses = ['active', 'inactive', 'error'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: `Status must be one of: ${validStatuses.join(', ')}`,
          },
          { status: 400 }
        );
      }
      updateData.status = body.status;

      // Clear error message when status changes to active
      if (body.status === 'active') {
        updateData.errorMessage = null;
      }
    }

    // Validate and add errorMessage if provided
    if (body.errorMessage !== undefined) {
      if (body.errorMessage === null) {
        updateData.errorMessage = null;
      } else if (typeof body.errorMessage === 'string') {
        updateData.errorMessage = body.errorMessage;
        // Automatically set status to error if error message is provided
        if (!body.status) {
          updateData.status = 'error';
        }
      } else {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            message: 'Error message must be a string or null',
          },
          { status: 400 }
        );
      }
    }

    // Update lastUsedAt if explicitly requested
    if (body.updateLastUsed === true) {
      updateData.lastUsedAt = new Date();
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

    const channel = await prisma.channel.update({
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
            publications: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: channel,
      message: 'Channel updated successfully',
    });
  } catch (error) {
    console.error('Error updating channel:', error);

    // Handle not found error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'Channel not found',
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update channel',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/channels/[id] - Disconnect channel
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
          message: 'Invalid channel ID format',
        },
        { status: 400 }
      );
    }

    // Optional: Check for force parameter to override warnings
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Check if channel has scheduled publications
    if (!force) {
      const scheduledPublications = await prisma.publication.count({
        where: {
          channelId: id,
          status: 'scheduled',
        },
      });

      if (scheduledPublications > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Conflict',
            message: `Channel has ${scheduledPublications} scheduled publication(s). Use ?force=true to delete anyway.`,
            meta: {
              scheduledPublications,
            },
          },
          { status: 409 }
        );
      }
    }

    // Get channel info before deleting (for response)
    const channel = await prisma.channel.findUnique({
      where: { id },
      select: {
        platform: true,
        productId: true,
      },
    });

    if (!channel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not found',
          message: 'Channel not found',
        },
        { status: 404 }
      );
    }

    // Delete the channel (cascade will handle publications)
    await prisma.channel.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Channel disconnected successfully',
      meta: {
        platform: channel.platform,
        productId: channel.productId,
      },
    });
  } catch (error) {
    console.error('Error deleting channel:', error);

    // Handle not found error
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          {
            success: false,
            error: 'Not found',
            message: 'Channel not found',
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disconnect channel',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
