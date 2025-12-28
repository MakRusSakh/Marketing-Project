/**
 * Content Adaptation API
 * Adapts content for different platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClaudeClient, PlatformAdapter, type Platform } from '@/services/ai';

/**
 * POST /api/content/[id]/adapt
 * Adapt content for a specific platform
 * Body: { targetPlatform }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { targetPlatform } = body;

    // Validate target platform
    if (!targetPlatform) {
      return NextResponse.json(
        { error: 'targetPlatform is required' },
        { status: 400 }
      );
    }

    const validPlatforms: Platform[] = ['twitter', 'linkedin', 'telegram', 'discord', 'vk', 'instagram'];
    if (!validPlatforms.includes(targetPlatform)) {
      return NextResponse.json(
        { error: `Invalid targetPlatform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Get content
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brandVoice: true,
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

    // Check for Claude API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      );
    }

    // Initialize AI services
    const claudeClient = new ClaudeClient(apiKey);
    const platformAdapter = new PlatformAdapter(claudeClient);

    // Determine source platform
    // If content has adapted versions, use the first one as source
    let sourcePlatform: Platform = 'twitter'; // default
    let sourceContent = content.originalText;

    if (content.adapted && typeof content.adapted === 'object') {
      const adaptedData = content.adapted as Record<string, any>;
      const platforms = Object.keys(adaptedData);

      if (platforms.length > 0) {
        sourcePlatform = platforms[0] as Platform;
        sourceContent = adaptedData[platforms[0]].content || content.originalText;
      }
    }

    // Check if already adapted for target platform
    if (content.adapted && typeof content.adapted === 'object') {
      const adaptedData = content.adapted as Record<string, any>;
      if (adaptedData[targetPlatform]) {
        // Already adapted, return cached version
        return NextResponse.json({
          adapted: adaptedData[targetPlatform],
          cached: true,
          sourcePlatform,
          targetPlatform,
        });
      }
    }

    // Adapt content for target platform
    const adaptedResult = await platformAdapter.adaptForPlatform(
      sourceContent,
      sourcePlatform,
      targetPlatform as Platform
    );

    // Parse hashtags from adapted content
    const hashtagRegex = /#\w+/g;
    const hashtags = adaptedResult.adapted.match(hashtagRegex) || [];

    // Count characters
    const characterCount = adaptedResult.adapted.length;

    // Update content with new adaptation
    const currentAdapted = (content.adapted as Record<string, any>) || {};
    const updatedAdapted = {
      ...currentAdapted,
      [targetPlatform]: {
        content: adaptedResult.adapted,
        hashtags,
        characterCount,
        adaptedFrom: sourcePlatform,
        changes: adaptedResult.changes,
        adaptedAt: new Date().toISOString(),
      },
    };

    // Save updated content
    await prisma.content.update({
      where: { id },
      data: {
        adapted: updatedAdapted,
      },
    });

    return NextResponse.json({
      adapted: {
        content: adaptedResult.adapted,
        hashtags,
        characterCount,
        changes: adaptedResult.changes,
      },
      cached: false,
      sourcePlatform: adaptedResult.sourcePlatform,
      targetPlatform: adaptedResult.targetPlatform,
      metadata: {
        adaptedAt: new Date().toISOString(),
        model: 'claude-3-sonnet',
      },
    });
  } catch (error) {
    console.error('Error adapting content:', error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service authentication failed' },
          { status: 401 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'AI service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      // Return the actual error message for debugging
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
