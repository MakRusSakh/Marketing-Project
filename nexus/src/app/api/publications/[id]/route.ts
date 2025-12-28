/**
 * Single Publication API Routes
 * Handles operations on individual publications
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  TwitterPublisher,
  TelegramPublisher,
  DiscordPublisher,
  VKPublisher,
  type Publisher,
} from '@/services/publishers';
import { PublishingQueue } from '@/services/publishers';

/**
 * GET /api/publications/[id]
 * Get a single publication with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const publication = await prisma.publication.findUnique({
      where: { id },
      include: {
        content: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            template: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        channel: {
          select: {
            id: true,
            platform: true,
            platformName: true,
            status: true,
            productId: true,
          },
        },
      },
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication not found' },
        { status: 404 }
      );
    }

    // Add computed metadata
    const metadata: any = {
      isScheduled: !!publication.scheduledAt,
      isPublished: publication.status === 'published',
      isFailed: publication.status === 'failed',
      canCancel: publication.status === 'scheduled',
      canRetry: publication.status === 'failed',
    };

    if (publication.scheduledAt) {
      const now = new Date();
      const scheduled = new Date(publication.scheduledAt);
      metadata.timeUntilPublish = Math.max(0, scheduled.getTime() - now.getTime());
      metadata.isPastDue = publication.status === 'scheduled' && scheduled.getTime() < now.getTime();
    }

    if (publication.publishedAt) {
      metadata.timeSincePublish = Date.now() - new Date(publication.publishedAt).getTime();
    }

    return NextResponse.json({
      ...publication,
      metadata,
    });
  } catch (error) {
    console.error('Error fetching publication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/publications/[id]
 * Cancel a scheduled publication or delete a failed one
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get publication
    const publication = await prisma.publication.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            platform: true,
            credentials: true,
          },
        },
      },
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication not found' },
        { status: 404 }
      );
    }

    // Check if publication can be deleted
    if (publication.status === 'published') {
      return NextResponse.json(
        {
          error: 'Cannot delete published content. Use the platform to remove the post.',
          platformUrl: publication.platformUrl,
        },
        { status: 400 }
      );
    }

    if (publication.status === 'publishing') {
      return NextResponse.json(
        { error: 'Cannot delete publication that is currently being published' },
        { status: 400 }
      );
    }

    // If it's a scheduled publication, try to cancel it from the queue
    if (publication.status === 'scheduled') {
      try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const publishingQueue = new PublishingQueue(redisUrl);

        // Try to find and cancel the job
        // Note: We would need to store the job ID in the publication record
        // For now, we just remove it from the database

        await publishingQueue.close();
      } catch (queueError) {
        console.warn('Failed to cancel job from queue:', queueError);
        // Continue with database deletion
      }
    }

    // Delete the publication
    await prisma.publication.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: publication.status === 'scheduled'
        ? 'Scheduled publication cancelled successfully'
        : 'Publication deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting publication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/publications/[id]
 * Update a publication (mainly for rescheduling or retrying failed publications)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, scheduledAt } = body;

    // Get publication
    const publication = await prisma.publication.findUnique({
      where: { id },
      include: {
        content: true,
        channel: {
          select: {
            id: true,
            platform: true,
            credentials: true,
            status: true,
          },
        },
      },
    });

    if (!publication) {
      return NextResponse.json(
        { error: 'Publication not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'reschedule') {
      // Validate scheduled time
      if (!scheduledAt) {
        return NextResponse.json(
          { error: 'scheduledAt is required for rescheduling' },
          { status: 400 }
        );
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduledAt date format' },
          { status: 400 }
        );
      }

      if (scheduledDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: 'scheduledAt must be in the future' },
          { status: 400 }
        );
      }

      // Can only reschedule scheduled or failed publications
      if (!['scheduled', 'failed'].includes(publication.status)) {
        return NextResponse.json(
          { error: 'Can only reschedule scheduled or failed publications' },
          { status: 400 }
        );
      }

      // Update publication
      const updated = await prisma.publication.update({
        where: { id },
        data: {
          scheduledAt: scheduledDate,
          status: 'scheduled',
          errorCode: null,
          errorMessage: null,
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

      return NextResponse.json({
        publication: updated,
        message: 'Publication rescheduled successfully',
      });
    }

    if (action === 'retry') {
      // Can only retry failed publications
      if (publication.status !== 'failed') {
        return NextResponse.json(
          { error: 'Can only retry failed publications' },
          { status: 400 }
        );
      }

      // Check if channel is active
      if (publication.channel.status !== 'active') {
        return NextResponse.json(
          { error: 'Channel is not active' },
          { status: 400 }
        );
      }

      // Determine content text
      let contentText = publication.content.originalText;
      if (publication.content.adapted && typeof publication.content.adapted === 'object') {
        const adaptedData = publication.content.adapted as Record<string, any>;
        if (adaptedData[publication.channel.platform]) {
          contentText = adaptedData[publication.channel.platform].content || publication.content.originalText;
        }
      }

      // Update status to publishing
      await prisma.publication.update({
        where: { id },
        data: {
          status: 'publishing',
          retryCount: publication.retryCount + 1,
        },
      });

      try {
        // Get credentials
        const credentials = publication.channel.credentials as any;

        // Initialize appropriate publisher
        let publisher: Publisher;

        switch (publication.channel.platform) {
          case 'twitter':
            publisher = new TwitterPublisher(credentials);
            break;

          case 'telegram':
            publisher = new TelegramPublisher(credentials);
            break;

          case 'discord':
            publisher = new DiscordPublisher(credentials);
            break;

          case 'vk':
            publisher = new VKPublisher(credentials);
            break;

          default:
            throw new Error(`Unsupported platform: ${publication.channel.platform}`);
        }

        // Publish content
        const result = await publisher.publish(contentText);

        if (result.success) {
          // Update with success
          const updated = await prisma.publication.update({
            where: { id },
            data: {
              status: 'published',
              publishedAt: new Date(),
              platformPostId: result.postId,
              platformUrl: result.postUrl,
              errorCode: null,
              errorMessage: null,
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

          return NextResponse.json({
            publication: updated,
            result: {
              postId: result.postId,
              postUrl: result.postUrl,
            },
            message: 'Publication retry successful',
          });
        } else {
          // Update with failure
          await prisma.publication.update({
            where: { id },
            data: {
              status: 'failed',
              errorCode: 'PUBLISH_FAILED',
              errorMessage: result.error || 'Unknown error',
            },
          });

          return NextResponse.json(
            {
              error: 'Retry failed',
              details: result.error,
            },
            { status: 500 }
          );
        }
      } catch (publishError) {
        // Update with error
        await prisma.publication.update({
          where: { id },
          data: {
            status: 'failed',
            errorCode: 'PUBLISH_ERROR',
            errorMessage: publishError instanceof Error ? publishError.message : 'Unknown error',
          },
        });

        return NextResponse.json(
          {
            error: 'Retry failed',
            details: publishError instanceof Error ? publishError.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Supported actions: reschedule, retry' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating publication:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
