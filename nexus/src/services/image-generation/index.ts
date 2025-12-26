/**
 * Image Generation Service
 * Multi-provider AI image generation for Marketing Nexus
 */

// Main classes
export { ImageGenerator, createImageGenerator } from './image-generator';

// Providers
export { OpenAIProvider } from './providers/openai-provider';
export { StabilityProvider } from './providers/stability-provider';
export { ReplicateProvider } from './providers/replicate-provider';

// Types and interfaces
export type {
  ImageProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
  GeneratedImage,
  ImageGeneratorConfig,
  ProviderStatus,
  IImageProvider,
} from './types';

export { ImageGenerationError } from './types';

// Constants
export { STABILITY_STYLE_PRESETS } from './providers/stability-provider';
export { REPLICATE_MODELS } from './providers/replicate-provider';
