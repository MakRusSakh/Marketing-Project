/**
 * Brand Voice Loader Service
 * Loads, analyzes, validates, and manages brand voice configurations
 */

import { ClaudeClient } from './claude-client';
import type { BrandVoice } from './prompt-builder';

/**
 * Extended brand voice with additional personality and style attributes
 */
export interface ExtendedBrandVoice extends BrandVoice {
  personality: string;
  formality: 'casual' | 'neutral' | 'formal';
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
  hashtagStyle: 'none' | 'minimal' | 'moderate' | 'heavy';
  responsePatterns: string[];
}

/**
 * Product context for generating default brand voice
 */
export interface ProductContext {
  name: string;
  description: string;
  targetAudience: string;
  uniqueValue?: string;
  category?: string;
  industry?: string;
}

/**
 * Validation result for brand voice completeness
 */
export interface VoiceValidationResult {
  isValid: boolean;
  completeness: number; // 0-100
  suggestions: string[];
  missingElements: string[];
}

/**
 * BrandVoiceLoader class for managing brand voice configurations
 */
export class BrandVoiceLoader {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new BrandVoiceLoader instance
   * @param claudeClient - Claude AI client for analysis
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Load brand voice from database (simulated)
   * In production, this would connect to a real database
   * @param productId - Unique product identifier
   * @returns Brand voice configuration
   */
  async loadFromProduct(productId: string): Promise<BrandVoice> {
    if (!productId || productId.trim().length === 0) {
      throw new Error('Product ID is required');
    }

    // In a real implementation, this would query a database
    // For now, we'll simulate with a default structure that would be populated from DB
    try {
      // Simulate database query delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // This would typically be fetched from database
      // Returning a structure that represents what would come from DB
      const storedVoice: BrandVoice = {
        tone: 'professional',
        style: 'informative and engaging',
        vocabulary: ['innovative', 'cutting-edge', 'streamlined', 'powerful'],
        avoidWords: ['cheap', 'basic', 'simple'],
        examples: [
          'Discover how our innovative solution transforms your workflow',
          'Join thousands of professionals who trust our platform',
        ],
      };

      return storedVoice;
    } catch (error) {
      throw new Error(
        `Failed to load brand voice for product ${productId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Analyze example posts to extract brand voice characteristics
   * Uses AI to identify patterns, tone, style, and vocabulary
   * @param examples - Array of example posts/content
   * @returns Extracted brand voice configuration
   */
  async analyzeExamples(examples: string[]): Promise<BrandVoice> {
    if (!examples || examples.length === 0) {
      throw new Error('At least one example is required for analysis');
    }

    // Filter out empty examples
    const validExamples = examples.filter((ex) => ex && ex.trim().length > 0);

    if (validExamples.length === 0) {
      throw new Error('No valid examples provided for analysis');
    }

    const systemPrompt = `You are an expert brand voice analyst. Analyze the provided content examples to extract and define the brand's voice characteristics.

Your task is to identify:
1. Overall tone (e.g., professional, casual, friendly, authoritative, playful, inspirational)
2. Writing style (e.g., concise, detailed, conversational, formal)
3. Preferred vocabulary and key terms
4. Words or phrases to avoid
5. Typical patterns and structures

Provide your analysis in the following JSON format:
{
  "tone": "description of tone",
  "style": "description of style",
  "vocabulary": ["word1", "word2", "word3"],
  "avoidWords": ["word1", "word2"],
  "examples": ["representative example 1", "representative example 2"]
}

Be specific and actionable in your analysis.`;

    const userPrompt = `Analyze these brand voice examples and extract the brand voice characteristics:

${validExamples.map((ex, idx) => `Example ${idx + 1}:\n${ex}`).join('\n\n')}

Provide the brand voice analysis in the specified JSON format.`;

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3, // Lower temperature for more consistent analysis
          maxTokens: 2000,
        }
      );

      // Parse the JSON response
      const brandVoice = this.parseAnalysisResponse(result.content);

      // Validate the extracted brand voice
      const validation = this.validateBrandVoice(brandVoice);

      if (!validation.isValid) {
        // If not fully valid, fill in missing elements with defaults
        return this.fillMissingElements(brandVoice, validation.missingElements);
      }

      return brandVoice;
    } catch (error) {
      throw new Error(
        `Failed to analyze brand voice examples: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Validate brand voice completeness and quality
   * @param voice - Brand voice to validate
   * @returns Validation result with completeness score and suggestions
   */
  validateBrandVoice(voice: BrandVoice): VoiceValidationResult {
    const missingElements: string[] = [];
    const suggestions: string[] = [];
    let completeness = 0;
    const totalElements = 5; // tone, style, vocabulary, avoidWords, examples

    // Check tone
    if (!voice.tone || voice.tone.trim().length === 0) {
      missingElements.push('tone');
      suggestions.push('Define a clear tone (e.g., professional, casual, friendly)');
    } else {
      completeness += 20;
    }

    // Check style
    if (!voice.style || voice.style.trim().length === 0) {
      missingElements.push('style');
      suggestions.push('Define the writing style (e.g., concise, detailed, conversational)');
    } else {
      completeness += 20;
    }

    // Check vocabulary
    if (!voice.vocabulary || voice.vocabulary.length === 0) {
      missingElements.push('vocabulary');
      suggestions.push('Add preferred vocabulary terms to strengthen brand consistency');
    } else if (voice.vocabulary.length < 3) {
      completeness += 10;
      suggestions.push('Consider adding more vocabulary terms (at least 3-5 recommended)');
    } else {
      completeness += 20;
    }

    // Check avoidWords
    if (!voice.avoidWords || voice.avoidWords.length === 0) {
      missingElements.push('avoidWords');
      suggestions.push('Define words to avoid for better brand alignment');
    } else {
      completeness += 20;
    }

    // Check examples
    if (!voice.examples || voice.examples.length === 0) {
      missingElements.push('examples');
      suggestions.push('Add example content to illustrate the brand voice in action');
    } else if (voice.examples.length < 2) {
      completeness += 10;
      suggestions.push('Add more examples (at least 2-3 recommended) to better showcase brand voice');
    } else {
      completeness += 20;
    }

    // Quality checks
    if (voice.vocabulary && voice.vocabulary.length > 20) {
      suggestions.push('Consider reducing vocabulary list to most essential terms (10-15 recommended)');
    }

    if (voice.examples && voice.examples.some((ex) => ex.length > 500)) {
      suggestions.push('Keep examples concise and representative (under 300 characters each)');
    }

    const isValid = missingElements.length === 0 && completeness >= 80;

    return {
      isValid,
      completeness,
      suggestions,
      missingElements,
    };
  }

  /**
   * Merge two brand voices, with primary taking precedence
   * Useful for combining custom overrides with default settings
   * @param primary - Primary brand voice (takes precedence)
   * @param secondary - Secondary brand voice (used for missing fields)
   * @returns Merged brand voice
   */
  mergeBrandVoices(primary: BrandVoice, secondary: BrandVoice): BrandVoice {
    return {
      tone: primary.tone || secondary.tone,
      style: primary.style || secondary.style,
      vocabulary: this.mergeArrays(primary.vocabulary, secondary.vocabulary),
      avoidWords: this.mergeArrays(primary.avoidWords, secondary.avoidWords),
      examples: this.mergeArrays(primary.examples, secondary.examples),
    };
  }

  /**
   * Generate default brand voice from product context
   * Uses AI to infer appropriate brand voice based on product information
   * @param productContext - Product information
   * @returns Generated brand voice configuration
   */
  async generateDefaultVoice(productContext: ProductContext): Promise<BrandVoice> {
    if (!productContext.name || !productContext.description) {
      throw new Error('Product name and description are required');
    }

    const systemPrompt = `You are an expert brand strategist. Generate an appropriate brand voice configuration based on the product information provided.

Consider:
- The product's target audience
- Industry standards and expectations
- The product's unique value proposition
- Appropriate tone and style for the category

Provide your recommendation in the following JSON format:
{
  "tone": "description of recommended tone",
  "style": "description of recommended style",
  "vocabulary": ["relevant", "terms", "for", "this", "brand"],
  "avoidWords": ["terms", "to", "avoid"],
  "examples": ["example message 1", "example message 2"]
}`;

    const userPrompt = this.buildProductContextPrompt(productContext);

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.5,
          maxTokens: 2000,
        }
      );

      // Parse the JSON response
      const brandVoice = this.parseAnalysisResponse(result.content);

      return brandVoice;
    } catch (error) {
      // If AI generation fails, return a sensible default
      return this.getFallbackBrandVoice(productContext);
    }
  }

  /**
   * Parse AI analysis response to extract BrandVoice
   * @private
   */
  private parseAnalysisResponse(content: string): BrandVoice {
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Ensure all required fields exist
      return {
        tone: parsed.tone || '',
        style: parsed.style || '',
        vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
        avoidWords: Array.isArray(parsed.avoidWords) ? parsed.avoidWords : [],
        examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      };
    } catch (error) {
      throw new Error(
        `Failed to parse brand voice analysis: ${
          error instanceof Error ? error.message : 'Invalid JSON format'
        }`
      );
    }
  }

  /**
   * Build product context prompt for AI generation
   * @private
   */
  private buildProductContextPrompt(context: ProductContext): string {
    let prompt = `Generate an appropriate brand voice for this product:

Product Name: ${context.name}
Description: ${context.description}
Target Audience: ${context.targetAudience}`;

    if (context.uniqueValue) {
      prompt += `\nUnique Value: ${context.uniqueValue}`;
    }

    if (context.category) {
      prompt += `\nCategory: ${context.category}`;
    }

    if (context.industry) {
      prompt += `\nIndustry: ${context.industry}`;
    }

    prompt += '\n\nProvide the brand voice configuration in the specified JSON format.';

    return prompt;
  }

  /**
   * Fill missing elements in brand voice with sensible defaults
   * @private
   */
  private fillMissingElements(
    voice: BrandVoice,
    missingElements: string[]
  ): BrandVoice {
    const filled: BrandVoice = { ...voice };

    if (missingElements.includes('tone')) {
      filled.tone = 'professional';
    }

    if (missingElements.includes('style')) {
      filled.style = 'clear and engaging';
    }

    if (missingElements.includes('vocabulary')) {
      filled.vocabulary = ['innovative', 'quality', 'trusted'];
    }

    if (missingElements.includes('avoidWords')) {
      filled.avoidWords = ['cheap', 'basic'];
    }

    if (missingElements.includes('examples')) {
      filled.examples = [
        'Discover our innovative solution',
        'Join our community of satisfied customers',
      ];
    }

    return filled;
  }

  /**
   * Get fallback brand voice when AI generation fails
   * @private
   */
  private getFallbackBrandVoice(context: ProductContext): BrandVoice {
    // Determine tone based on product category/industry
    let tone = 'professional';
    let style = 'clear and informative';
    const vocabulary: string[] = ['innovative', 'reliable', 'quality'];
    const avoidWords: string[] = ['cheap', 'outdated'];

    // Adjust based on target audience if available
    const audienceLower = context.targetAudience?.toLowerCase() || '';

    if (audienceLower.includes('young') || audienceLower.includes('student')) {
      tone = 'friendly and casual';
      style = 'conversational and relatable';
    } else if (audienceLower.includes('enterprise') || audienceLower.includes('business')) {
      tone = 'professional and authoritative';
      style = 'formal and detailed';
    } else if (audienceLower.includes('creative') || audienceLower.includes('artist')) {
      tone = 'inspirational and vibrant';
      style = 'expressive and engaging';
    }

    return {
      tone,
      style,
      vocabulary,
      avoidWords,
      examples: [
        `${context.name} - transforming the way you work`,
        `Join the community and experience ${context.name}`,
      ],
    };
  }

  /**
   * Merge two arrays, removing duplicates and prioritizing first array
   * @private
   */
  private mergeArrays(primary: string[], secondary: string[]): string[] {
    if (!primary || primary.length === 0) {
      return secondary || [];
    }

    if (!secondary || secondary.length === 0) {
      return primary;
    }

    // Combine and remove duplicates (case-insensitive)
    const combined = [...primary];
    const primaryLower = primary.map((item) => item.toLowerCase());

    for (const item of secondary) {
      if (!primaryLower.includes(item.toLowerCase())) {
        combined.push(item);
      }
    }

    return combined;
  }
}
