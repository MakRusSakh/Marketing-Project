/**
 * Image Generation API
 * POST /api/images/generate
 * Generates AI images using multiple providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createImageGenerator,
  type ImageGenerationRequest,
  type ImageProvider,
  ImageGenerationError,
} from '@/services/image-generation';

/**
 * POST /api/images/generate
 * Generate images using AI providers
 *
 * Body:
 * {
 *   prompt: string;
 *   productId?: string;
 *   contentId?: string;
 *   provider?: 'openai' | 'stability' | 'replicate';
 *   width?: number;
 *   height?: number;
 *   style?: string;
 *   count?: number;
 *   negativePrompt?: string;
 *   quality?: 'standard' | 'hd';
 *   enhancePrompt?: boolean;
 *   saveToContent?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      productId,
      contentId,
      provider,
      width,
      height,
      style,
      count = 1,
      negativePrompt,
      quality = 'standard',
      enhancePrompt = false,
      saveToContent = true,
    } = body;

    // Validate required fields
    if (!prompt || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'prompt is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (prompt.length > 4000) {
      return NextResponse.json(
        { error: 'prompt is too long (max 4000 characters)' },
        { status: 400 }
      );
    }

    // Validate provider if specified
    const validProviders: ImageProvider[] = ['openai', 'stability', 'replicate'];
    if (provider && !validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate dimensions
    if (width && (width < 64 || width > 2048)) {
      return NextResponse.json(
        { error: 'width must be between 64 and 2048 pixels' },
        { status: 400 }
      );
    }

    if (height && (height < 64 || height > 2048)) {
      return NextResponse.json(
        { error: 'height must be between 64 and 2048 pixels' },
        { status: 400 }
      );
    }

    // Validate count
    if (count < 1 || count > 10) {
      return NextResponse.json(
        { error: 'count must be between 1 and 10' },
        { status: 400 }
      );
    }

    // Validate product exists if productId is provided
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
    }

    // Validate content exists if contentId is provided
    if (contentId) {
      const content = await prisma.content.findUnique({
        where: { id: contentId },
      });

      if (!content) {
        return NextResponse.json(
          { error: 'Content not found' },
          { status: 404 }
        );
      }
    }

    // Initialize image generator
    const generator = createImageGenerator();

    // Check if any providers are configured
    if (!generator.hasConfiguredProviders()) {
      return NextResponse.json(
        {
          error: 'No image generation providers configured. Please set OPENAI_API_KEY, STABILITY_API_KEY, or REPLICATE_API_TOKEN in environment variables.',
        },
        { status: 503 }
      );
    }

    // Enhance prompt if requested
    let finalPrompt = prompt;
    if (enhancePrompt) {
      try {
        finalPrompt = await generator.enhancePrompt(prompt);
      } catch (error) {
        console.error('Failed to enhance prompt:', error);
        // Continue with original prompt if enhancement fails
      }
    }

    // Prepare generation request
    const generationRequest: ImageGenerationRequest = {
      prompt: finalPrompt,
      negativePrompt,
      width,
      height,
      style,
      numberOfImages: count,
      provider: provider as ImageProvider,
      quality,
    };

    // Validate request
    const validation = generator.validateRequest(generationRequest);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.errors },
        { status: 400 }
      );
    }

    // Generate images with fallback
    const result = await generator.generateWithFallback(generationRequest);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Image generation failed' },
        { status: 500 }
      );
    }

    // Prepare media metadata
    const mediaMetadata = {
      images: result.images.map(img => ({
        url: img.url,
        base64: img.base64,
        width: img.width,
        height: img.height,
        provider: img.provider,
        seed: img.seed,
        metadata: img.metadata,
      })),
      generatedAt: new Date().toISOString(),
      provider: result.provider,
      originalPrompt: prompt,
      enhancedPrompt: enhancePrompt ? finalPrompt : undefined,
      cost: result.cost,
    };

    // Save to content if requested and contentId is provided
    let savedContent = null;
    if (saveToContent) {
      if (contentId) {
        // Update existing content
        savedContent = await prisma.content.update({
          where: { id: contentId },
          data: {
            media: mediaMetadata,
            aiGenerated: true,
            aiPrompt: finalPrompt,
            aiModel: result.metadata?.model || result.provider,
            updatedAt: new Date(),
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
      } else if (productId) {
        // Create new content
        savedContent = await prisma.content.create({
          data: {
            productId,
            originalText: `AI-generated images: ${prompt}`,
            media: mediaMetadata,
            contentType: 'image',
            aiGenerated: true,
            aiPrompt: finalPrompt,
            aiModel: result.metadata?.model || result.provider,
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
      }
    }

    // Return response
    return NextResponse.json(
      {
        success: true,
        images: result.images.map(img => ({
          url: img.url,
          width: img.width,
          height: img.height,
          provider: img.provider,
          revisedPrompt: img.revisedPrompt,
          seed: img.seed,
        })),
        metadata: {
          provider: result.provider,
          originalPrompt: prompt,
          enhancedPrompt: enhancePrompt ? finalPrompt : undefined,
          numberOfImages: result.images.length,
          cost: result.cost,
          model: result.metadata?.model,
          executionTime: result.metadata?.executionTime,
        },
        content: savedContent ? {
          id: savedContent.id,
          productId: savedContent.productId,
          status: savedContent.status,
        } : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating images:', error);

    // Handle specific errors
    if (error instanceof ImageGenerationError) {
      return NextResponse.json(
        {
          error: error.message,
          provider: error.provider,
          code: error.code,
        },
        { status: error.statusCode || 500 }
      );
    }

    if (error instanceof Error) {
      // Check for common errors
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Image generation service authentication failed' },
          { status: 401 }
        );
      }

      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Image generation service rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Image generation timed out. Please try again.' },
          { status: 504 }
        );
      }

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

/**
 * GET /api/images/generate
 * Get status of image generation providers
 */
export async function GET(request: NextRequest) {
  try {
    const generator = createImageGenerator();

    if (!generator.hasConfiguredProviders()) {
      return NextResponse.json({
        configured: false,
        providers: [],
        message: 'No image generation providers configured',
      });
    }

    const statuses = await generator.getProviderStatus();

    return NextResponse.json({
      configured: true,
      providers: statuses.map(status => ({
        provider: status.provider,
        available: status.available,
        configured: status.configured,
        credits: status.credits,
        error: status.error,
      })),
      defaultProvider: generator.getDefaultProvider(),
    });
  } catch (error) {
    console.error('Error checking provider status:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check provider status',
      },
      { status: 500 }
    );
  }
}
