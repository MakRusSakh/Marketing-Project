/**
 * Stability AI Provider
 * Implements image generation using Stability AI API (SDXL, SD3)
 */

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
 * Stability AI style presets
 */
export const STABILITY_STYLE_PRESETS = [
  'enhance',
  'anime',
  'photographic',
  'digital-art',
  'comic-book',
  'fantasy-art',
  'line-art',
  'analog-film',
  'neon-punk',
  'isometric',
  'low-poly',
  'origami',
  'modeling-compound',
  'cinematic',
  '3d-model',
  'pixel-art',
] as const;

type StabilityStylePreset = typeof STABILITY_STYLE_PRESETS[number];

interface StabilityImageResponse {
  artifacts: Array<{
    base64: string;
    seed: number;
    finishReason: string;
  }>;
}

/**
 * Stability AI image generation provider
 */
export class StabilityProvider implements IImageProvider {
  readonly provider = 'stability' as const;
  readonly config: ImageGeneratorConfig;
  private baseUrl = 'https://api.stability.ai';

  constructor(config: ImageGeneratorConfig) {
    this.config = {
      ...config,
      defaultWidth: config.defaultWidth || 1024,
      defaultHeight: config.defaultHeight || 1024,
      defaultModel: config.defaultModel || 'stable-diffusion-xl-1024-v1-0',
      defaultStyle: config.defaultStyle || 'enhance',
    };

    if (!this.config.apiKey) {
      throw new ImageGenerationError(
        'Stability AI API key is required',
        'stability',
        'MISSING_API_KEY'
      );
    }
  }

  /**
   * Generate images using Stability AI
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      // Validate prompt
      if (!request.prompt || request.prompt.trim().length === 0) {
        throw new ImageGenerationError(
          'Prompt cannot be empty',
          'stability',
          'INVALID_PROMPT'
        );
      }

      // Prepare request parameters
      const width = request.width || this.config.defaultWidth || 1024;
      const height = request.height || this.config.defaultHeight || 1024;
      const samples = Math.min(request.numberOfImages || 1, 4); // Max 4 images
      const model = request.model || this.config.defaultModel || 'stable-diffusion-xl-1024-v1-0';

      // Prepare style preset
      let stylePreset: StabilityStylePreset | undefined;
      if (request.style && STABILITY_STYLE_PRESETS.includes(request.style as StabilityStylePreset)) {
        stylePreset = request.style as StabilityStylePreset;
      } else if (this.config.defaultStyle && STABILITY_STYLE_PRESETS.includes(this.config.defaultStyle as StabilityStylePreset)) {
        stylePreset = this.config.defaultStyle as StabilityStylePreset;
      }

      // Build request body
      const body: any = {
        text_prompts: [
          {
            text: request.prompt,
            weight: 1,
          },
        ],
        cfg_scale: 7,
        height,
        width,
        samples,
        steps: 30,
      };

      // Add negative prompt if provided
      if (request.negativePrompt) {
        body.text_prompts.push({
          text: request.negativePrompt,
          weight: -1,
        });
      }

      // Add style preset if valid
      if (stylePreset) {
        body.style_preset = stylePreset;
      }

      // Make API request
      const response = await fetch(
        `${this.baseUrl}/v1/generation/${model}/text-to-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ImageGenerationError(
          errorData.message || `Stability AI API error: ${response.statusText}`,
          'stability',
          'API_ERROR',
          response.status
        );
      }

      const data = await response.json() as StabilityImageResponse;

      // Convert base64 images to data URLs
      const images: GeneratedImage[] = data.artifacts.map((artifact, index) => ({
        url: `data:image/png;base64,${artifact.base64}`,
        base64: artifact.base64,
        width,
        height,
        provider: 'stability',
        prompt: request.prompt,
        seed: artifact.seed,
        metadata: {
          model,
          stylePreset,
          finishReason: artifact.finishReason,
        },
      }));

      const executionTime = Date.now() - startTime;

      // Calculate estimated cost (approximate based on Stability AI pricing)
      const cost = this.calculateCost(width, height, samples);

      return {
        success: true,
        images,
        provider: 'stability',
        cost,
        metadata: {
          model,
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
      // Try to get account balance to verify API key
      const response = await fetch(`${this.baseUrl}/v1/user/balance`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        provider: 'stability',
        available: true,
        configured: true,
        lastChecked: new Date(),
        credits: data.credits,
      };
    } catch (error) {
      return {
        provider: 'stability',
        available: false,
        configured: !!this.config.apiKey,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate estimated cost based on image dimensions and count
   * Stability AI pricing varies, this is an approximation
   */
  private calculateCost(width: number, height: number, samples: number): number {
    const pixels = width * height;
    const megapixels = pixels / 1_000_000;

    // Rough estimate: $0.01 per megapixel
    return megapixels * samples * 0.01;
  }

  /**
   * Handle errors from Stability AI API
   */
  private handleError(error: unknown): ImageGenerationResult {
    if (error instanceof ImageGenerationError) {
      return {
        success: false,
        images: [],
        provider: 'stability',
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        images: [],
        provider: 'stability',
        error: error.message,
      };
    }

    return {
      success: false,
      images: [],
      provider: 'stability',
      error: 'Unknown error occurred',
    };
  }
}
