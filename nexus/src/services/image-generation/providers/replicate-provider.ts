/**
 * Replicate Provider
 * Implements image generation using Replicate API (Flux, SDXL, and other models)
 */

import Replicate from 'replicate';
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
 * Available Replicate models for image generation
 */
export const REPLICATE_MODELS = {
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'flux-dev': 'black-forest-labs/flux-dev',
  'flux-pro': 'black-forest-labs/flux-pro',
  'sdxl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  'sdxl-lightning': 'bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f',
} as const;

type ReplicateModel = keyof typeof REPLICATE_MODELS;

/**
 * Replicate API prediction response
 */
interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[] | string | null;
  error?: string;
  logs?: string;
}

/**
 * Replicate image generation provider
 */
export class ReplicateProvider implements IImageProvider {
  readonly provider = 'replicate' as const;
  readonly config: ImageGeneratorConfig;
  private client: Replicate;

  constructor(config: ImageGeneratorConfig) {
    this.config = {
      ...config,
      defaultWidth: config.defaultWidth || 1024,
      defaultHeight: config.defaultHeight || 1024,
      defaultModel: config.defaultModel || 'flux-schnell',
      maxRetries: config.maxRetries || 60, // Max polling attempts
      timeout: config.timeout || 300000, // 5 minutes default timeout
    };

    if (!this.config.apiKey) {
      throw new ImageGenerationError(
        'Replicate API key is required',
        'replicate',
        'MISSING_API_KEY'
      );
    }

    try {
      this.client = new Replicate({
        auth: this.config.apiKey,
      });
    } catch (error) {
      throw new ImageGenerationError(
        'Failed to initialize Replicate client',
        'replicate',
        'INITIALIZATION_ERROR',
        undefined,
        error
      );
    }
  }

  /**
   * Generate images using Replicate
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      // Validate prompt
      if (!request.prompt || request.prompt.trim().length === 0) {
        throw new ImageGenerationError(
          'Prompt cannot be empty',
          'replicate',
          'INVALID_PROMPT'
        );
      }

      // Determine model
      const modelKey = (request.model as ReplicateModel) || (this.config.defaultModel as ReplicateModel) || 'flux-schnell';
      const modelVersion = REPLICATE_MODELS[modelKey];

      if (!modelVersion) {
        throw new ImageGenerationError(
          `Invalid model: ${modelKey}`,
          'replicate',
          'INVALID_MODEL'
        );
      }

      // Prepare input parameters
      const input: any = {
        prompt: request.prompt,
        num_outputs: Math.min(request.numberOfImages || 1, 4),
      };

      // Add dimensions if supported by model
      if (modelKey.includes('flux') || modelKey.includes('sdxl')) {
        input.width = request.width || this.config.defaultWidth || 1024;
        input.height = request.height || this.config.defaultHeight || 1024;
      }

      // Add negative prompt for SDXL models
      if (modelKey.includes('sdxl') && request.negativePrompt) {
        input.negative_prompt = request.negativePrompt;
      }

      // Add guidance scale for better control
      if (modelKey.includes('sdxl')) {
        input.guidance_scale = 7.5;
        input.num_inference_steps = 25;
      }

      // Run prediction
      const output = await this.client.run(modelVersion as any, { input });

      // Parse output
      const images = this.parseOutput(
        output,
        request.prompt,
        input.width || 1024,
        input.height || 1024,
        modelKey
      );

      const executionTime = Date.now() - startTime;

      // Calculate estimated cost (Replicate pricing varies by model)
      const cost = this.calculateCost(modelKey, input.num_outputs, executionTime);

      return {
        success: true,
        images,
        provider: 'replicate',
        cost,
        metadata: {
          model: modelKey,
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
      // Try to list predictions to verify API key
      await this.client.predictions.list();

      return {
        provider: 'replicate',
        available: true,
        configured: true,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        provider: 'replicate',
        available: false,
        configured: !!this.config.apiKey,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse Replicate output to GeneratedImage array
   */
  private parseOutput(
    output: unknown,
    prompt: string,
    width: number,
    height: number,
    model: string
  ): GeneratedImage[] {
    const images: GeneratedImage[] = [];

    if (Array.isArray(output)) {
      // Output is an array of URLs
      for (const url of output) {
        if (typeof url === 'string') {
          images.push({
            url,
            width,
            height,
            provider: 'replicate',
            prompt,
            metadata: {
              model,
            },
          });
        }
      }
    } else if (typeof output === 'string') {
      // Output is a single URL
      images.push({
        url: output,
        width,
        height,
        provider: 'replicate',
        prompt,
        metadata: {
          model,
        },
      });
    }

    return images;
  }

  /**
   * Calculate estimated cost based on model and execution time
   * Replicate pricing varies by model and compute time
   */
  private calculateCost(model: string, numOutputs: number, executionTimeMs: number): number {
    const executionSeconds = executionTimeMs / 1000;

    // Rough estimates based on Replicate pricing
    let pricePerSecond = 0.0023; // Default GPU pricing

    if (model.includes('flux-pro')) {
      pricePerSecond = 0.005; // More expensive
    } else if (model.includes('flux-schnell') || model.includes('lightning')) {
      pricePerSecond = 0.0015; // Faster, cheaper
    }

    return pricePerSecond * executionSeconds * numOutputs;
  }

  /**
   * Handle errors from Replicate API
   */
  private handleError(error: unknown): ImageGenerationResult {
    if (error instanceof ImageGenerationError) {
      return {
        success: false,
        images: [],
        provider: 'replicate',
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        images: [],
        provider: 'replicate',
        error: error.message,
      };
    }

    return {
      success: false,
      images: [],
      provider: 'replicate',
      error: 'Unknown error occurred',
    };
  }
}
