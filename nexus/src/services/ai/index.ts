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
