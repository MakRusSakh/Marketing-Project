/**
 * Content Generator Service
 * Orchestrates AI-powered content generation using Claude
 */

import {
  ResponseParser,
  Platform,
  PLATFORM_LIMITS,
  ParsedContent,
} from "./response-parser";
import { ClaudeClient } from "./claude-client";
import type {
  BrandVoice as PromptBrandVoice,
  ProductContext as PromptProductContext,
  ContentType as PromptContentType,
} from "./prompt-builder";

// Re-export types from prompt-builder for convenience
export type ContentType = PromptContentType;

// Extended ProductContext with additional fields
export interface ProductContext extends PromptProductContext {
  category?: string;
  keyFeatures?: string[];
  uniqueSellingPoints?: string[];
  pricing?: {
    model: string;
    range?: string;
  };
  website?: string;
}

// Extended BrandVoice with additional fields
export interface BrandVoice extends Omit<PromptBrandVoice, 'tone' | 'vocabulary'> {
  tone: "professional" | "casual" | "friendly" | "authoritative" | "playful" | "inspirational";
  personality?: string[];
  keywords?: string[];
  vocabulary?: string[];
  writingStyle?: "concise" | "detailed" | "conversational" | "formal";
  emojiUsage?: "none" | "minimal" | "moderate" | "frequent";
}

export interface GeneratePostRequest {
  product: ProductContext;
  brandVoice?: BrandVoice;
  platform: Platform;
  contentType: ContentType;
  topic: string;
  keywords?: string[];
  length?: "short" | "medium" | "long";
}

export interface GeneratedPost {
  content: string;
  hashtags: string[];
  platform: Platform;
  characterCount: number;
  isValid: boolean;
  suggestions?: string[];
}

export interface GenerateThreadRequest extends GeneratePostRequest {
  targetPosts: number; // 3-10 posts in thread
}

export interface GeneratedThread {
  posts: GeneratedPost[];
  totalCharacters: number;
  estimatedReadTime: number;
}

/**
 * ContentGenerator class for AI-powered content creation
 */
export class ContentGenerator {
  private parser: ResponseParser;
  private claudeClient: ClaudeClient;

  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
    this.parser = new ResponseParser();
  }

  /**
   * Generate a single post for a specific platform
   * @param request Post generation request parameters
   * @returns Generated post with metadata
   */
  async generatePost(request: GeneratePostRequest): Promise<GeneratedPost> {
    this.validatePostRequest(request);

    const prompt = this.buildPostPrompt(request);
    const systemPrompt = this.buildSystemPrompt(request.brandVoice);

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        prompt,
        {
          maxTokens: this.getMaxTokensForLength(request.length),
          temperature: 0.7,
        }
      );

      return this.parseAndValidatePost(result.content, request.platform);
    } catch (error) {
      throw new Error(
        `Failed to generate post: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Generate a multi-post thread
   * @param request Thread generation request parameters
   * @returns Generated thread with multiple posts
   */
  async generateThread(
    request: GenerateThreadRequest
  ): Promise<GeneratedThread> {
    this.validateThreadRequest(request);

    const prompt = this.buildThreadPrompt(request);
    const systemPrompt = this.buildSystemPrompt(request.brandVoice);

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        prompt,
        {
          maxTokens: this.getMaxTokensForThread(request.targetPosts),
          temperature: 0.7,
        }
      );

      const parsedThread = this.parser.parseThreadResponse(result.content);

      // Validate each post and create GeneratedPost objects
      const posts = parsedThread.posts.map((postContent) =>
        this.parseAndValidatePost(postContent, request.platform)
      );

      // Recalculate totals
      const totalCharacters = posts.reduce(
        (sum, post) => sum + post.characterCount,
        0
      );

      return {
        posts,
        totalCharacters,
        estimatedReadTime: parsedThread.estimatedReadTime,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate thread: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Adapt existing content for a different platform
   * @param content Original content
   * @param targetPlatform Target platform
   * @returns Adapted content
   */
  async adaptContent(
    content: string,
    targetPlatform: Platform
  ): Promise<string> {
    if (!content || !content.trim()) {
      throw new Error("Content cannot be empty");
    }

    const prompt = this.buildAdaptationPrompt(content, targetPlatform);

    try {
      const result = await this.claudeClient.generateContent(prompt, {
        maxTokens: 1000,
        temperature: 0.5,
      });

      const response = result.content;

      // Validate the adapted content
      const validation = this.parser.validateLength(response, targetPlatform);

      if (!validation.valid) {
        // Try to truncate intelligently if too long
        return this.truncateContent(response, targetPlatform);
      }

      return response.trim();
    } catch (error) {
      throw new Error(
        `Failed to adapt content: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Suggest hashtags for content on a specific platform
   * @param content Content to analyze
   * @param platform Target platform
   * @returns Array of suggested hashtags
   */
  async suggestHashtags(
    content: string,
    platform: Platform
  ): Promise<string[]> {
    if (!content || !content.trim()) {
      throw new Error("Content cannot be empty");
    }

    const prompt = this.buildHashtagPrompt(content, platform);

    try {
      const result = await this.claudeClient.generateContent(prompt, {
        maxTokens: 300,
        temperature: 0.6,
      });

      const response = result.content;

      // Extract hashtags from response
      const hashtags = this.parser.extractHashtags(response);

      // If no hashtags found, try splitting by commas or newlines
      if (hashtags.length === 0) {
        return response
          .split(/[,\n]/)
          .map((tag) => tag.trim().replace(/^#/, ""))
          .filter((tag) => tag.length > 0)
          .slice(0, this.getHashtagLimit(platform));
      }

      return hashtags.slice(0, this.getHashtagLimit(platform));
    } catch (error) {
      throw new Error(
        `Failed to suggest hashtags: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Build prompt for single post generation
   * @private
   */
  private buildPostPrompt(request: GeneratePostRequest): string {
    const {
      product,
      platform,
      contentType,
      topic,
      keywords = [],
      length = "medium",
    } = request;

    const characterLimit = PLATFORM_LIMITS[platform];
    const targetLength = this.getTargetLength(length, characterLimit);

    let prompt = `Generate a ${contentType} post for ${platform} about: ${topic}\n\n`;

    prompt += `Product Information:\n`;
    prompt += `- Name: ${product.name}\n`;
    prompt += `- Description: ${product.description}\n`;

    if (product.category) {
      prompt += `- Category: ${product.category}\n`;
    }

    prompt += `- Target Audience: ${product.targetAudience}\n`;

    if (product.uniqueValue) {
      prompt += `- Unique Value: ${product.uniqueValue}\n`;
    }

    if (product.keyFeatures && product.keyFeatures.length > 0) {
      prompt += `- Key Features: ${product.keyFeatures.join(", ")}\n`;
    }

    if (product.uniqueSellingPoints && product.uniqueSellingPoints.length > 0) {
      prompt += `- Unique Selling Points: ${product.uniqueSellingPoints.join(", ")}\n`;
    }

    prompt += `\nPlatform Requirements:\n`;
    prompt += `- Platform: ${platform}\n`;
    prompt += `- Maximum Length: ${characterLimit} characters\n`;
    prompt += `- Target Length: ${targetLength} characters\n`;

    if (keywords.length > 0) {
      prompt += `\nKeywords to Include: ${keywords.join(", ")}\n`;
    }

    prompt += `\nInstructions:\n`;
    prompt += `1. Create engaging, platform-appropriate content\n`;
    prompt += `2. Stay within the character limit\n`;
    prompt += `3. Include relevant hashtags (${this.getHashtagGuidance(platform)})\n`;
    prompt += `4. Make it ${length} length\n`;
    prompt += `5. Include a clear call-to-action if appropriate\n`;
    prompt += `6. Match the platform's typical content style\n`;

    return prompt;
  }

  /**
   * Build prompt for thread generation
   * @private
   */
  private buildThreadPrompt(request: GenerateThreadRequest): string {
    const { product, platform, topic, targetPosts } = request;

    const characterLimit = PLATFORM_LIMITS[platform];

    let prompt = `Generate a thread of ${targetPosts} posts for ${platform} about: ${topic}\n\n`;

    prompt += `Product Information:\n`;
    prompt += `- Name: ${product.name}\n`;
    prompt += `- Description: ${product.description}\n`;

    if (product.category) {
      prompt += `- Category: ${product.category}\n`;
    }

    prompt += `- Target Audience: ${product.targetAudience}\n`;

    if (product.uniqueValue) {
      prompt += `- Unique Value: ${product.uniqueValue}\n`;
    }

    if (product.keyFeatures && product.keyFeatures.length > 0) {
      prompt += `- Key Features: ${product.keyFeatures.join(", ")}\n`;
    }

    if (product.uniqueSellingPoints && product.uniqueSellingPoints.length > 0) {
      prompt += `- Unique Selling Points: ${product.uniqueSellingPoints.join(", ")}\n`;
    }

    prompt += `\nThread Requirements:\n`;
    prompt += `- Number of posts: ${targetPosts}\n`;
    prompt += `- Platform: ${platform}\n`;
    prompt += `- Maximum length per post: ${characterLimit} characters\n`;

    prompt += `\nInstructions:\n`;
    prompt += `1. Create a cohesive narrative across all posts\n`;
    prompt += `2. Each post should work standalone but build on the thread\n`;
    prompt += `3. First post should hook the reader\n`;
    prompt += `4. Last post should include a strong call-to-action\n`;
    prompt += `5. Separate posts with "---" on a new line\n`;
    prompt += `6. Keep each post within the character limit\n`;
    prompt += `7. Include relevant hashtags in the first and/or last post\n`;

    return prompt;
  }

  /**
   * Build prompt for content adaptation
   * @private
   */
  private buildAdaptationPrompt(
    content: string,
    targetPlatform: Platform
  ): string {
    const characterLimit = PLATFORM_LIMITS[targetPlatform];

    let prompt = `Adapt the following content for ${targetPlatform}:\n\n`;
    prompt += `Original Content:\n${content}\n\n`;
    prompt += `Platform Requirements:\n`;
    prompt += `- Platform: ${targetPlatform}\n`;
    prompt += `- Maximum Length: ${characterLimit} characters\n`;
    prompt += `\nInstructions:\n`;
    prompt += `1. Maintain the core message and intent\n`;
    prompt += `2. Adapt the tone and style for ${targetPlatform}\n`;
    prompt += `3. Stay within the character limit\n`;
    prompt += `4. Adjust hashtags and mentions appropriately\n`;
    prompt += `5. Preserve any important links or CTAs\n`;
    prompt += `6. Return ONLY the adapted content, no explanations\n`;

    return prompt;
  }

  /**
   * Build prompt for hashtag suggestions
   * @private
   */
  private buildHashtagPrompt(content: string, platform: Platform): string {
    const limit = this.getHashtagLimit(platform);

    let prompt = `Suggest relevant hashtags for this ${platform} content:\n\n`;
    prompt += `Content:\n${content}\n\n`;
    prompt += `Requirements:\n`;
    prompt += `- Provide ${limit} highly relevant hashtags\n`;
    prompt += `- Make them specific and searchable\n`;
    prompt += `- Mix popular and niche hashtags\n`;
    prompt += `- Format: Return hashtags separated by commas or one per line\n`;
    prompt += `- Include the # symbol\n`;

    return prompt;
  }

  /**
   * Build system prompt based on brand voice
   * @private
   */
  private buildSystemPrompt(brandVoice?: BrandVoice): string {
    if (!brandVoice) {
      return "You are an expert social media content creator. Create engaging, platform-appropriate content that drives engagement.";
    }

    let systemPrompt = `You are an expert social media content creator with the following brand voice:\n\n`;
    systemPrompt += `Tone: ${brandVoice.tone}\n`;

    if (brandVoice.style) {
      systemPrompt += `Style: ${brandVoice.style}\n`;
    }

    if (brandVoice.personality && brandVoice.personality.length > 0) {
      systemPrompt += `Personality Traits: ${brandVoice.personality.join(", ")}\n`;
    }

    if (brandVoice.writingStyle) {
      systemPrompt += `Writing Style: ${brandVoice.writingStyle}\n`;
    }

    if (brandVoice.vocabulary && brandVoice.vocabulary.length > 0) {
      systemPrompt += `Preferred Vocabulary: ${brandVoice.vocabulary.join(", ")}\n`;
    }

    if (brandVoice.keywords && brandVoice.keywords.length > 0) {
      systemPrompt += `Preferred Keywords: ${brandVoice.keywords.join(", ")}\n`;
    }

    if (brandVoice.avoidWords && brandVoice.avoidWords.length > 0) {
      systemPrompt += `Words to Avoid: ${brandVoice.avoidWords.join(", ")}\n`;
    }

    if (brandVoice.emojiUsage) {
      systemPrompt += `Emoji Usage: ${brandVoice.emojiUsage}\n`;
    }

    if (brandVoice.examples && brandVoice.examples.length > 0) {
      systemPrompt += `\nBrand Voice Examples:\n`;
      brandVoice.examples.forEach((example, i) => {
        systemPrompt += `${i + 1}. "${example}"\n`;
      });
    }

    systemPrompt += `\nCreate content that authentically reflects this brand voice while being engaging and effective.`;

    return systemPrompt;
  }

  /**
   * Parse and validate generated post
   * @private
   */
  private parseAndValidatePost(
    content: string,
    platform: Platform
  ): GeneratedPost {
    const parsed = this.parser.parseContentResponse(content);
    const validation = this.parser.validateLength(
      parsed.mainContent,
      platform
    );

    const suggestions: string[] = [];

    // Add suggestions based on validation issues
    if (!validation.valid) {
      suggestions.push(...validation.issues);
    }

    // Check hashtag count
    if (platform === "instagram" && parsed.hashtags.length > 30) {
      suggestions.push(
        `Consider reducing hashtags to 30 or fewer for Instagram`
      );
    }

    // Check for missing elements
    if (parsed.hashtags.length === 0 && platform !== "linkedin") {
      suggestions.push(`Consider adding relevant hashtags`);
    }

    return {
      content: parsed.mainContent,
      hashtags: parsed.hashtags,
      platform,
      characterCount: validation.characterCount,
      isValid: validation.valid,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Validate post generation request
   * @private
   */
  private validatePostRequest(request: GeneratePostRequest): void {
    if (!request.product?.name) {
      throw new Error("Product name is required");
    }

    if (!request.platform) {
      throw new Error("Platform is required");
    }

    if (!request.topic) {
      throw new Error("Topic is required");
    }

    if (!PLATFORM_LIMITS[request.platform]) {
      throw new Error(`Unsupported platform: ${request.platform}`);
    }
  }

  /**
   * Validate thread generation request
   * @private
   */
  private validateThreadRequest(request: GenerateThreadRequest): void {
    this.validatePostRequest(request);

    if (!request.targetPosts || request.targetPosts < 3 || request.targetPosts > 10) {
      throw new Error("Thread must have between 3 and 10 posts");
    }
  }

  /**
   * Get maximum tokens based on content length
   * @private
   */
  private getMaxTokensForLength(length: string = "medium"): number {
    const tokens = {
      short: 300,
      medium: 600,
      long: 1000,
    };

    return tokens[length as keyof typeof tokens] || tokens.medium;
  }

  /**
   * Get maximum tokens for thread generation
   * @private
   */
  private getMaxTokensForThread(postCount: number): number {
    return postCount * 400; // ~400 tokens per post
  }

  /**
   * Get target length based on preference and limit
   * @private
   */
  private getTargetLength(
    length: string,
    characterLimit: number
  ): number {
    const percentages = {
      short: 0.4,
      medium: 0.7,
      long: 0.9,
    };

    const percentage = percentages[length as keyof typeof percentages] || percentages.medium;
    return Math.floor(characterLimit * percentage);
  }

  /**
   * Get hashtag limit for platform
   * @private
   */
  private getHashtagLimit(platform: Platform): number {
    const limits: Record<Platform, number> = {
      twitter: 2,
      linkedin: 3,
      telegram: 5,
      discord: 3,
      vk: 10,
      instagram: 10,
    };

    return limits[platform] || 5;
  }

  /**
   * Get hashtag guidance for platform
   * @private
   */
  private getHashtagGuidance(platform: Platform): string {
    const guidance: Record<Platform, string> = {
      twitter: "1-2 hashtags",
      linkedin: "3-5 hashtags",
      telegram: "3-5 hashtags",
      discord: "minimal hashtags",
      vk: "5-10 hashtags",
      instagram: "10-30 hashtags",
    };

    return guidance[platform] || "3-5 hashtags";
  }

  /**
   * Intelligently truncate content to fit platform limits
   * @private
   */
  private truncateContent(content: string, platform: Platform): string {
    const limit = PLATFORM_LIMITS[platform];
    const suffix = "...";

    if (content.length <= limit) {
      return content;
    }

    // Try to truncate at sentence boundary
    const truncateAt = limit - suffix.length;
    const truncated = content.substring(0, truncateAt);

    // Find last sentence ending
    const lastPeriod = truncated.lastIndexOf(".");
    const lastExclamation = truncated.lastIndexOf("!");
    const lastQuestion = truncated.lastIndexOf("?");

    const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastSentence > truncateAt * 0.7) {
      // Only use sentence boundary if it's not too far back
      return truncated.substring(0, lastSentence + 1);
    }

    // Otherwise truncate at word boundary
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace) + suffix;
    }

    return truncated + suffix;
  }
}
