/**
 * AI Content Generation API
 * Generates content using Claude AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ClaudeClient, ContentGenerator, type Platform, type ContentType } from '@/services/ai';

/**
 * POST /api/content/generate
 * Generate content using AI
 * Body: { productId, platform, topic, contentType, keywords?, length? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      platform,
      topic,
      contentType = 'post',
      keywords = [],
      length = 'medium',
    } = body;

    // Validate required fields
    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      );
    }

    if (!platform) {
      return NextResponse.json(
        { error: 'platform is required' },
        { status: 400 }
      );
    }

    if (!topic || topic.trim() === '') {
      return NextResponse.json(
        { error: 'topic is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate platform
    const validPlatforms: Platform[] = ['twitter', 'linkedin', 'telegram', 'discord', 'vk', 'instagram'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate content type
    const validContentTypes: ContentType[] = ['post', 'article', 'tweet', 'story', 'announcement', 'update', 'promotional', 'educational'];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid contentType. Must be one of: ${validContentTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate length
    const validLengths = ['short', 'medium', 'long'];
    if (!validLengths.includes(length)) {
      return NextResponse.json(
        { error: `Invalid length. Must be one of: ${validLengths.join(', ')}` },
        { status: 400 }
      );
    }

    // Get product details with brand voice
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
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
    const contentGenerator = new ContentGenerator(claudeClient);

    // Prepare product context
    const productContext = {
      name: product.name,
      description: product.description || '',
      targetAudience: 'General audience', // Could be extracted from product settings
      uniqueValue: 'Innovative solution', // Could be extracted from product settings
    };

    // Extract brand voice from product
    const brandVoice = product.brandVoice ? (product.brandVoice as any) : undefined;

    // Generate content
    const generatedPost = await contentGenerator.generatePost({
      product: productContext,
      brandVoice,
      platform: platform as Platform,
      contentType: contentType as ContentType,
      topic,
      keywords,
      length,
    });

    // Build adapted content for the platform
    const adapted = {
      [platform]: {
        content: generatedPost.content,
        hashtags: generatedPost.hashtags,
        characterCount: generatedPost.characterCount,
      },
    };

    // Create AI predictions object
    const predictions = {
      platform,
      isValid: generatedPost.isValid,
      characterCount: generatedPost.characterCount,
      suggestions: generatedPost.suggestions || [],
      generatedAt: new Date().toISOString(),
    };

    // Save generated content to database
    const content = await prisma.content.create({
      data: {
        productId,
        originalText: generatedPost.content,
        adapted,
        contentType,
        aiGenerated: true,
        aiPrompt: `Topic: ${topic}, Platform: ${platform}, Keywords: ${keywords.join(', ')}`,
        aiModel: 'claude-3-sonnet',
        predictions,
        status: 'draft',
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Return generated content with metadata
    return NextResponse.json({
      content,
      generated: {
        text: generatedPost.content,
        hashtags: generatedPost.hashtags,
        platform,
        characterCount: generatedPost.characterCount,
        isValid: generatedPost.isValid,
        suggestions: generatedPost.suggestions,
      },
      metadata: {
        topic,
        contentType,
        keywords,
        length,
        model: 'claude-3-sonnet',
        generatedAt: new Date().toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating content:', error);

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
