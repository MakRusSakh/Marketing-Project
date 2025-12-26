/**
 * AI Services Module
 *
 * Exports Claude API client, prompt builder utilities,
 * response parser, and content generator for generating marketing content.
 */

// Export Claude Client
export {
  ClaudeClient,
  AIError,
  type GenerateOptions,
  type GenerationResult,
} from './claude-client';

// Export Prompt Builder
export {
  PromptBuilder,
  type BrandVoice,
  type ProductContext,
  type ContentType,
  type Platform,
  type ContentLength,
} from './prompt-builder';

// Export Response Parser
export {
  ResponseParser,
  responseParser,
  PLATFORM_LIMITS,
  type ParsedContent,
  type ParsedThread,
  type ValidationResult,
  type Platform as ResponsePlatform,
} from './response-parser';

// Export Content Generator
export {
  ContentGenerator,
  type GeneratePostRequest,
  type GeneratedPost,
  type GenerateThreadRequest,
  type GeneratedThread,
  type ProductContext as ExtendedProductContext,
  type BrandVoice as ExtendedBrandVoice,
  type ContentType as GeneratorContentType,
} from './content-generator';

// Export Brand Voice Loader
export {
  BrandVoiceLoader,
  type ExtendedBrandVoice as FullBrandVoice,
  type ProductContext as VoiceProductContext,
  type VoiceValidationResult,
} from './brand-voice-loader';

// Export Engagement Predictor
export {
  EngagementPredictor,
  type EngagementPrediction,
  type ImprovementSuggestion,
  type PostComparison,
  type PostingTimeRecommendation,
} from './engagement-predictor';

// Export Platform Adapter
export {
  PlatformAdapter,
  type Platform as AdapterPlatform,
  type AdaptedContent,
  type OptimizedContent,
  type ThreadSplit,
} from './platform-adapter';

// Export Thread Generator
export {
  ThreadGenerator,
  type Platform as ThreadPlatform,
  type ThreadOptions,
  type GeneratedThread as GeneratedThreadContent,
} from './thread-generator';
