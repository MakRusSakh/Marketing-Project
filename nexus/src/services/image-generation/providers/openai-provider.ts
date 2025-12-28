/**
 * OpenAI DALL-E Provider
 * Implements image generation using OpenAI's DALL-E 3 API
 */

import OpenAI from 'openai';
import {
  type IImageProvider,
  type ImageGeneratorConfig,
  type ImageGenerationRequest,
  type ImageGenerationResult,
  type ProviderStatus,
  type GeneratedImage,
  ImageGenerationError,
} from '../types';

/**
 * Valid DALL-E 3 image sizes
 */
const VALID_SIZES = ['1024x1024', '1792x1024', '1024x1792'] as const;
type DallESize = typeof VALID_SIZES[number];

/**
 * OpenAI DALL-E image generation provider
 */
export class OpenAIProvider implements IImageProvider {
  readonly provider = 'openai' as const;
  readonly config: ImageGeneratorConfig;
  private client: OpenAI;

  constructor(config: ImageGeneratorConfig) {
    this.config = {
      ...config,
      defaultWidth: config.defaultWidth || 1024,
      defaultHeight: config.defaultHeight || 1024,
      defaultModel: config.defaultModel || 'dall-e-3',
    };

    if (!this.config.apiKey) {
      throw new ImageGenerationError(
        'OpenAI API key is required',
        'openai',
        'MISSING_API_KEY'
      );
    }

    try {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
      });
    } catch (error) {
      throw new ImageGenerationError(
        'Failed to initialize OpenAI client',
        'openai',
        'INITIALIZATION_ERROR',
        undefined,
        error
      );
    }
  }

  /**
   * Generate images using DALL-E 3
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      // Validate prompt
      if (!request.prompt || request.prompt.trim().length === 0) {
        throw new ImageGenerationError(
          'Prompt cannot be empty',
          'openai',
          'INVALID_PROMPT'
        );
      }

      // Determine size
      const size = this.getDallESize(
        request.width || this.config.defaultWidth || 1024,
        request.height || this.config.defaultHeight || 1024
      );

      // Determine quality
      const quality = request.quality || 'standard';

      // Determine style
      const style = (request.style === 'vivid' || request.style === 'natural')
        ? request.style
        : 'vivid';

      // DALL-E 3 only supports 1 image at a time
      const n = 1;

      // Generate image
      const response = await this.client.images.generate({
        model: request.model || this.config.defaultModel || 'dall-e-3',
        prompt: request.prompt,
        n,
        size,
        quality,
        style,
        response_format: 'url',
      });

      // Parse response
      const images: GeneratedImage[] = response.data.map((image) => ({
        url: image.url || '',
        width: this.parseSizeWidth(size),
        height: this.parseSizeHeight(size),
        provider: 'openai',
        prompt: request.prompt,
        revisedPrompt: image.revised_prompt,
        metadata: {
          model: request.model || 'dall-e-3',
          quality,
          style,
        },
      }));

      const executionTime = Date.now() - startTime;

      // Calculate estimated cost (DALL-E 3 pricing as of 2024)
      const cost = this.calculateCost(quality, size);

      return {
        success: true,
        images,
        provider: 'openai',
        cost,
        metadata: {
          model: request.model || 'dall-e-3',
          executionTime,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check provider status
   */
  async checkStatus(): Promise<ProviderStatus> {
    try {
      // Try to list models to verify API key is valid
      await this.client.models.list();

      return {
        provider: 'openai',
        available: true,
        configured: true,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        provider: 'openai',
        available: false,
        configured: !!this.config.apiKey,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Convert width/height to DALL-E size format
   */
  private getDallESize(width: number, height: number): DallESize {
    // Find the closest valid size
    if (width === height) {
      return '1024x1024';
    }

    if (width > height) {
      return '1792x1024'; // Landscape
    }

    return '1024x1792'; // Portrait
  }

  /**
   * Parse width from size string
   */
  private parseSizeWidth(size: DallESize): number {
    return parseInt(size.split('x')[0], 10);
  }

  /**
   * Parse height from size string
   */
  private parseSizeHeight(size: DallESize): number {
    return parseInt(size.split('x')[1], 10);
  }

  /**
   * Calculate estimated cost based on DALL-E 3 pricing
   * Standard: $0.040 per 1024×1024, $0.080 per 1024×1792 or 1792×1024
   * HD: $0.080 per 1024×1024, $0.120 per 1024×1792 or 1792×1024
   */
  private calculateCost(quality: string, size: DallESize): number {
    const isHD = quality === 'hd';
    const isLarge = size !== '1024x1024';

    if (isHD) {
      return isLarge ? 0.12 : 0.08;
    }

    return isLarge ? 0.08 : 0.04;
  }

  /**
   * Handle errors from OpenAI API
   */
  private handleError(error: unknown): ImageGenerationResult {
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        images: [],
        provider: 'openai',
        error: error.message,
        metadata: {
          executionTime: 0,
        },
      };
    }

    if (error instanceof ImageGenerationError) {
      return {
        success: false,
        images: [],
        provider: 'openai',
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        images: [],
        provider: 'openai',
        error: error.message,
      };
    }

    return {
      success: false,
      images: [],
      provider: 'openai',
      error: 'Unknown error occurred',
    };
  }
}
