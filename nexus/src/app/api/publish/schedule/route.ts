/**
 * Publishing Schedule API
 * Handles scheduling content for future publication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PublishingQueue } from '@/services/publishers';

/**
 * POST /api/publish/schedule
 * Schedule content for future publication
 * Body: { contentId, channelId, scheduledAt }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentId, channelId, scheduledAt } = body;

    // Validate required fields
    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId is required' },
        { status: 400 }
      );
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId is required' },
        { status: 400 }
      );
    }

    if (!scheduledAt) {
      return NextResponse.json(
        { error: 'scheduledAt is required' },
        { status: 400 }
      );
    }

    // Validate and parse scheduled time
    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduledAt date format' },
        { status: 400 }
      );
    }

    // Check if scheduled time is in the future
    const now = new Date();
    if (scheduledDate.getTime() <= now.getTime()) {
      return NextResponse.json(
        { error: 'scheduledAt must be in the future' },
        { status: 400 }
      );
    }

    // Get content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Get channel
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Verify channel belongs to the same product as content
    if (channel.productId !== content.productId) {
      return NextResponse.json(
        { error: 'Channel does not belong to the same product as content' },
        { status: 400 }
      );
    }

    // Check if channel is active
    if (channel.status !== 'active') {
      return NextResponse.json(
        { error: 'Channel is not active' },
        { status: 400 }
      );
    }

    // Check for existing scheduled publication for this content and channel
    const existingPublication = await prisma.publication.findFirst({
      where: {
        contentId,
        channelId,
        status: 'scheduled',
      },
    });

    if (existingPublication) {
      return NextResponse.json(
        {
          error: 'Content is already scheduled for this channel',
          publicationId: existingPublication.id,
          scheduledAt: existingPublication.scheduledAt,
        },
        { status: 409 }
      );
    }

    // Determine content text for the platform
    let contentText = content.originalText;
    if (content.adapted && typeof content.adapted === 'object') {
      const adaptedData = content.adapted as Record<string, any>;
      if (adaptedData[channel.platform]) {
        contentText = adaptedData[channel.platform].content || content.originalText;
      }
    }

    // Create publication record
    const publication = await prisma.publication.create({
      data: {
        contentId,
        channelId,
        status: 'scheduled',
        scheduledAt: scheduledDate,
      },
      include: {
        content: {
          select: {
            id: true,
            originalText: true,
            contentType: true,
          },
        },
        channel: {
          select: {
            id: true,
            platform: true,
            platformName: true,
          },
        },
      },
    });

    // Initialize publishing queue and schedule the job
    let queueJobId: string | null = null;
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const publishingQueue = new PublishingQueue(redisUrl);

      // Add job to queue
      queueJobId = await publishingQueue.schedulePublish(
        {
          contentId,
          channelId,
          content: contentText,
        },
        scheduledDate
      );

      // Close the queue connection
      await publishingQueue.close();
    } catch (queueError) {
      console.warn('Failed to add job to publishing queue:', queueError);
      // Don't fail the request - the publication is still created in the database
      // A worker can pick it up based on the scheduledAt time
    }

    return NextResponse.json({
      publication,
      scheduled: {
        scheduledAt: scheduledDate.toISOString(),
        timeUntilPublish: scheduledDate.getTime() - now.getTime(),
        queueJobId,
      },
      message: 'Content scheduled successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error scheduling publication:', error);

    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { error: 'Invalid contentId or channelId' },
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
