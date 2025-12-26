/**
 * Publishing API
 * Handles immediate content publishing to channels
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

/**
 * POST /api/publish
 * Publish content to a channel immediately or schedule for later
 * Body: { contentId, channelId, scheduledAt? }
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

    // Check if channel is active
    if (channel.status !== 'active') {
      return NextResponse.json(
        { error: 'Channel is not active' },
        { status: 400 }
      );
    }

    // Validate scheduled time if provided
    let scheduledDate: Date | null = null;
    if (scheduledAt) {
      scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduledAt date' },
          { status: 400 }
        );
      }

      // Check if scheduled time is in the future
      if (scheduledDate.getTime() <= Date.now()) {
        return NextResponse.json(
          { error: 'scheduledAt must be in the future' },
          { status: 400 }
        );
      }
    }

    // Determine content text for the platform
    let contentText = content.originalText;
    if (content.adapted && typeof content.adapted === 'object') {
      const adaptedData = content.adapted as Record<string, any>;
      if (adaptedData[channel.platform]) {
        contentText = adaptedData[channel.platform].content || content.originalText;
      }
    }

    // If scheduling for later, create publication record and return
    if (scheduledDate) {
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

      return NextResponse.json({
        publication,
        message: 'Content scheduled successfully',
      }, { status: 201 });
    }

    // Publish immediately
    try {
      // Create publication record with 'publishing' status
      const publication = await prisma.publication.create({
        data: {
          contentId,
          channelId,
          status: 'publishing',
        },
      });

      // Get credentials
      const credentials = channel.credentials as any;

      // Initialize appropriate publisher
      let publisher: Publisher;

      switch (channel.platform) {
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
          // Update publication status to failed
          await prisma.publication.update({
            where: { id: publication.id },
            data: {
              status: 'failed',
              errorCode: 'UNSUPPORTED_PLATFORM',
              errorMessage: `Platform ${channel.platform} is not supported`,
            },
          });

          return NextResponse.json(
            { error: `Platform ${channel.platform} is not supported` },
            { status: 400 }
          );
      }

      // Publish content
      const result = await publisher.publish(contentText);

      if (result.success) {
        // Update publication with success
        const updatedPublication = await prisma.publication.update({
          where: { id: publication.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
            platformPostId: result.postId,
            platformUrl: result.postUrl,
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

        // Update channel last used
        await prisma.channel.update({
          where: { id: channelId },
          data: {
            lastUsedAt: new Date(),
          },
        });

        // Update content status if it was draft
        if (content.status === 'draft') {
          await prisma.content.update({
            where: { id: contentId },
            data: {
              status: 'published',
            },
          });
        }

        return NextResponse.json({
          publication: updatedPublication,
          result: {
            postId: result.postId,
            postUrl: result.postUrl,
          },
          message: 'Content published successfully',
        }, { status: 201 });
      } else {
        // Update publication with failure
        await prisma.publication.update({
          where: { id: publication.id },
          data: {
            status: 'failed',
            errorCode: 'PUBLISH_FAILED',
            errorMessage: result.error || 'Unknown error',
          },
        });

        return NextResponse.json(
          {
            error: 'Failed to publish content',
            details: result.error,
          },
          { status: 500 }
        );
      }
    } catch (publishError) {
      console.error('Error during publishing:', publishError);

      return NextResponse.json(
        {
          error: 'Failed to publish content',
          details: publishError instanceof Error ? publishError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in publish endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
