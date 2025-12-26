/**
 * Image Generator Service
 * Main orchestration class for multi-provider image generation
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  type ImageProvider,
  type ImageGeneratorConfig,
  type ImageGenerationRequest,
  type ImageGenerationResult,
  type ProviderStatus,
  type IImageProvider,
  ImageGenerationError,
} from './types';
import { OpenAIProvider } from './providers/openai-provider';
import { StabilityProvider } from './providers/stability-provider';
import { ReplicateProvider } from './providers/replicate-provider';

/**
 * Main ImageGenerator class for generating images with multiple providers
 */
export class ImageGenerator {
  private providers: Map<ImageProvider, IImageProvider> = new Map();
  private defaultProvider: ImageProvider;
  private claudeClient?: Anthropic;

  constructor(defaultProvider: ImageProvider = 'openai') {
    this.defaultProvider = defaultProvider;

    // Initialize Claude client for prompt enhancement if API key is available
    const claudeApiKey = process.env.ANTHROPIC_API_KEY;
    if (claudeApiKey) {
      this.claudeClient = new Anthropic({ apiKey: claudeApiKey });
    }
  }

  /**
   * Add or configure a provider
   */
  addProvider(provider: ImageProvider, config: ImageGeneratorConfig): void {
    try {
      let providerInstance: IImageProvider;

      switch (provider) {
        case 'openai':
          providerInstance = new OpenAIProvider(config);
          break;
        case 'stability':
          providerInstance = new StabilityProvider(config);
          break;
        case 'replicate':
          providerInstance = new ReplicateProvider(config);
          break;
        case 'midjourney':
          // Midjourney doesn't have an official API yet
          // This would require a third-party service or Discord bot
          throw new ImageGenerationError(
            'Midjourney provider not yet implemented',
            provider,
            'NOT_IMPLEMENTED'
          );
        case 'leonardo':
          // Leonardo.ai integration would go here
          throw new ImageGenerationError(
            'Leonardo provider not yet implemented',
            provider,
            'NOT_IMPLEMENTED'
          );
        default:
          throw new ImageGenerationError(
            `Unknown provider: ${provider}`,
            provider,
            'UNKNOWN_PROVIDER'
          );
      }

      this.providers.set(provider, providerInstance);
    } catch (error) {
      if (error instanceof ImageGenerationError) {
        throw error;
      }
      throw new ImageGenerationError(
        `Failed to add provider ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        provider,
        'PROVIDER_INIT_FAILED',
        undefined,
        error
      );
    }
  }

  /**
   * Remove a provider
   */
  removeProvider(provider: ImageProvider): void {
    this.providers.delete(provider);
  }

  /**
   * Get configured provider
   */
  getProvider(provider: ImageProvider): IImageProvider | undefined {
    return this.providers.get(provider);
  }

  /**
   * Check if a provider is configured
   */
  hasProvider(provider: ImageProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Set default provider
   */
  setDefaultProvider(provider: ImageProvider): void {
    if (!this.providers.has(provider)) {
      throw new ImageGenerationError(
        `Provider ${provider} is not configured`,
        provider,
        'PROVIDER_NOT_CONFIGURED'
      );
    }
    this.defaultProvider = provider;
  }

  /**
   * Get default provider
   */
  getDefaultProvider(): ImageProvider {
    return this.defaultProvider;
  }

  /**
   * Generate images using the specified or default provider
   */
  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const provider = request.provider || this.defaultProvider;

    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new ImageGenerationError(
        `Provider ${provider} is not configured`,
        provider,
        'PROVIDER_NOT_CONFIGURED'
      );
    }

    return providerInstance.generate(request);
  }

  /**
   * Generate images with automatic fallback to other providers on failure
   */
  async generateWithFallback(
    request: ImageGenerationRequest,
    providerOrder?: ImageProvider[]
  ): Promise<ImageGenerationResult> {
    const providers = providerOrder || [
      request.provider || this.defaultProvider,
      ...Array.from(this.providers.keys()).filter(
        p => p !== (request.provider || this.defaultProvider)
      ),
    ];

    const errors: Array<{ provider: ImageProvider; error: string }> = [];

    for (const provider of providers) {
      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        continue;
      }

      try {
        const result = await providerInstance.generate({
          ...request,
          provider,
        });

        if (result.success) {
          return result;
        }

        errors.push({
          provider,
          error: result.error || 'Generation failed',
        });
      } catch (error) {
        errors.push({
          provider,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // All providers failed
    return {
      success: false,
      images: [],
      provider: this.defaultProvider,
      error: `All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join('; ')}`,
    };
  }

  /**
   * Enhance a prompt using Claude AI
   */
  async enhancePrompt(prompt: string): Promise<string> {
    if (!this.claudeClient) {
      // Return original prompt if Claude is not configured
      return prompt;
    }

    try {
      const response = await this.claudeClient.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: `You are an expert at creating detailed, effective prompts for AI image generation.

Take this image prompt and enhance it with more vivid details, artistic style specifications, lighting, composition, and quality modifiers that will produce a better image. Keep the core concept but make it more specific and detailed.

Original prompt: ${prompt}

Return ONLY the enhanced prompt, no explanations or commentary.`,
          },
        ],
      });

      const enhancedPrompt = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as Anthropic.TextBlock).text)
        .join('')
        .trim();

      return enhancedPrompt || prompt;
    } catch (error) {
      console.error('Failed to enhance prompt with Claude:', error);
      return prompt;
    }
  }

  /**
   * Get status of all configured providers
   */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    const statusPromises = Array.from(this.providers.values()).map(provider =>
      provider.checkStatus().catch(error => ({
        provider: provider.provider,
        available: false,
        configured: true,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Status check failed',
      }))
    );

    return Promise.all(statusPromises);
  }

  /**
   * Get list of configured providers
   */
  getConfiguredProviders(): ImageProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if any providers are configured
   */
  hasConfiguredProviders(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Validate image generation request
   */
  validateRequest(request: ImageGenerationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate prompt
    if (!request.prompt || request.prompt.trim().length === 0) {
      errors.push('Prompt is required and cannot be empty');
    }

    if (request.prompt && request.prompt.length > 4000) {
      errors.push('Prompt is too long (max 4000 characters)');
    }

    // Validate dimensions
    if (request.width && (request.width < 64 || request.width > 2048)) {
      errors.push('Width must be between 64 and 2048 pixels');
    }

    if (request.height && (request.height < 64 || request.height > 2048)) {
      errors.push('Height must be between 64 and 2048 pixels');
    }

    // Validate number of images
    if (request.numberOfImages && (request.numberOfImages < 1 || request.numberOfImages > 10)) {
      errors.push('Number of images must be between 1 and 10');
    }

    // Validate provider
    if (request.provider && !this.providers.has(request.provider)) {
      errors.push(`Provider ${request.provider} is not configured`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Create a default ImageGenerator instance with environment-based configuration
 */
export function createImageGenerator(): ImageGenerator {
  const generator = new ImageGenerator();

  // Configure OpenAI if API key is available
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      generator.addProvider('openai', {
        provider: 'openai',
        apiKey: openaiKey,
      });
    } catch (error) {
      console.error('Failed to configure OpenAI provider:', error);
    }
  }

  // Configure Stability AI if API key is available
  const stabilityKey = process.env.STABILITY_API_KEY;
  if (stabilityKey) {
    try {
      generator.addProvider('stability', {
        provider: 'stability',
        apiKey: stabilityKey,
      });
    } catch (error) {
      console.error('Failed to configure Stability provider:', error);
    }
  }

  // Configure Replicate if API key is available
  const replicateKey = process.env.REPLICATE_API_TOKEN;
  if (replicateKey) {
    try {
      generator.addProvider('replicate', {
        provider: 'replicate',
        apiKey: replicateKey,
      });
    } catch (error) {
      console.error('Failed to configure Replicate provider:', error);
    }
  }

  return generator;
}
