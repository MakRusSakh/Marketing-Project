/**
 * Image Generation Service Types
 * Defines interfaces and types for multi-provider image generation
 */

/**
 * Supported image generation providers
 */
export type ImageProvider = 'openai' | 'stability' | 'midjourney' | 'replicate' | 'leonardo';

/**
 * Request for generating images
 */
export interface ImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  style?: string;
  numberOfImages?: number;
  provider?: ImageProvider;
  quality?: 'standard' | 'hd';
  model?: string;
}

/**
 * A single generated image
 */
export interface GeneratedImage {
  url: string;
  base64?: string;
  width: number;
  height: number;
  provider: ImageProvider;
  prompt: string;
  revisedPrompt?: string;
  seed?: number;
  metadata?: Record<string, any>;
}

/**
 * Result of image generation
 */
export interface ImageGenerationResult {
  success: boolean;
  images: GeneratedImage[];
  provider: ImageProvider;
  cost?: number;
  error?: string;
  metadata?: {
    model?: string;
    executionTime?: number;
    credits?: number;
  };
}

/**
 * Configuration for an image provider
 */
export interface ImageGeneratorConfig {
  provider: ImageProvider;
  apiKey: string;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultStyle?: string;
  defaultModel?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Provider status information
 */
export interface ProviderStatus {
  provider: ImageProvider;
  available: boolean;
  configured: boolean;
  lastChecked: Date;
  error?: string;
  credits?: number;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

/**
 * Base interface for image providers
 */
export interface IImageProvider {
  readonly provider: ImageProvider;
  readonly config: ImageGeneratorConfig;

  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  checkStatus(): Promise<ProviderStatus>;
}

/**
 * Error class for image generation errors
 */
export class ImageGenerationError extends Error {
  constructor(
    message: string,
    public provider: ImageProvider,
    public code?: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ImageGenerationError';
    Object.setPrototypeOf(this, ImageGenerationError.prototype);
  }
}
