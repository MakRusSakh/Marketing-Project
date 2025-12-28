/**
 * Brand voice configuration
 */
export interface BrandVoice {
  tone: string;
  style: string;
  vocabulary: string[];
  avoidWords: string[];
  examples: string[];
}

/**
 * Product context for content generation
 */
export interface ProductContext {
  name: string;
  description: string;
  targetAudience: string;
  uniqueValue: string;
}

/**
 * Supported content types
 */
export type ContentType = 'post' | 'thread' | 'story' | 'article' | 'announcement';

/**
 * Supported social media platforms
 */
export type Platform = 'twitter' | 'linkedin' | 'telegram' | 'discord' | 'vk' | 'instagram';

/**
 * Content length options
 */
export type ContentLength = 'short' | 'medium' | 'long';

/**
 * Platform-specific constraints and best practices
 */
const PLATFORM_CONSTRAINTS: Record<Platform, {
  maxLength?: number;
  bestPractices: string[];
  format: string;
}> = {
  twitter: {
    maxLength: 280,
    bestPractices: [
      'Use hashtags strategically (2-3 max)',
      'Include engaging questions or CTAs',
      'Keep it concise and impactful',
      'Use line breaks for readability',
    ],
    format: 'Short-form social media post',
  },
  linkedin: {
    bestPractices: [
      'Professional and value-driven tone',
      'Use relevant hashtags (3-5)',
      'Include industry insights',
      'Encourage professional engagement',
      'Can be longer and more detailed',
    ],
    format: 'Professional social media post',
  },
  telegram: {
    bestPractices: [
      'Direct and conversational',
      'Can use emojis moderately',
      'Include links when relevant',
      'Encourage community interaction',
    ],
    format: 'Messaging platform post',
  },
  discord: {
    bestPractices: [
      'Casual and community-focused',
      'Encourage discussion and replies',
      'Can use emojis and Discord formatting',
      'Keep it conversational',
    ],
    format: 'Community platform message',
  },
  vk: {
    bestPractices: [
      'Localized content approach',
      'Visual and engaging',
      'Use hashtags for discoverability',
      'Community-oriented',
    ],
    format: 'Social network post',
  },
  instagram: {
    bestPractices: [
      'Visual-first approach (describe visual context)',
      'Use relevant hashtags (up to 30)',
      'Include strong captions',
      'Encourage engagement through questions',
      'Can use emojis freely',
    ],
    format: 'Visual social media caption',
  },
};

/**
 * Content length guidelines
 */
const LENGTH_GUIDELINES: Record<ContentLength, {
  words: string;
  description: string;
}> = {
  short: {
    words: '50-150 words',
    description: 'Brief, punchy content that gets straight to the point',
  },
  medium: {
    words: '150-300 words',
    description: 'Moderate length with key details and context',
  },
  long: {
    words: '300-500 words',
    description: 'Comprehensive content with full details and examples',
  },
};

/**
 * Fluent API builder for creating marketing content prompts
 */
export class PromptBuilder {
  private platform?: Platform;
  private brandVoice?: BrandVoice;
  private product?: ProductContext;
  private contentType?: ContentType;
  private topic?: string;
  private keywords: string[] = [];
  private length?: ContentLength;

  /**
   * Private constructor to enforce factory pattern
   */
  private constructor() {}

  /**
   * Creates a new PromptBuilder instance
   */
  static create(): PromptBuilder {
    return new PromptBuilder();
  }

  /**
   * Sets the target platform for content generation
   */
  forPlatform(platform: Platform): this {
    this.platform = platform;
    return this;
  }

  /**
   * Sets the brand voice for content generation
   */
  withBrandVoice(voice: BrandVoice): this {
    this.brandVoice = voice;
    return this;
  }

  /**
   * Sets the product context for content generation
   */
  withProduct(product: ProductContext): this {
    this.product = product;
    return this;
  }

  /**
   * Sets the content type
   */
  asContentType(type: ContentType): this {
    this.contentType = type;
    return this;
  }

  /**
   * Sets the main topic for content
   */
  withTopic(topic: string): this {
    this.topic = topic;
    return this;
  }

  /**
   * Sets keywords for SEO and relevance
   */
  withKeywords(keywords: string[]): this {
    this.keywords = keywords;
    return this;
  }

  /**
   * Sets the desired content length
   */
  withLength(length: ContentLength): this {
    this.length = length;
    return this;
  }

  /**
   * Builds the system prompt with role and constraints
   */
  buildSystemPrompt(): string {
    const sections: string[] = [];

    // Role definition
    sections.push(
      'You are an expert marketing content creator specializing in social media and digital marketing. ' +
      'Your goal is to create engaging, brand-aligned content that resonates with the target audience and drives meaningful engagement.'
    );

    // Brand voice guidelines
    if (this.brandVoice) {
      sections.push('\n## Brand Voice Guidelines');
      sections.push(`Tone: ${this.brandVoice.tone}`);
      sections.push(`Style: ${this.brandVoice.style}`);

      if (this.brandVoice.vocabulary.length > 0) {
        sections.push(`\nPreferred vocabulary: ${this.brandVoice.vocabulary.join(', ')}`);
      }

      if (this.brandVoice.avoidWords.length > 0) {
        sections.push(`\nWords to avoid: ${this.brandVoice.avoidWords.join(', ')}`);
      }

      if (this.brandVoice.examples.length > 0) {
        sections.push('\nBrand voice examples:');
        this.brandVoice.examples.forEach((example, index) => {
          sections.push(`${index + 1}. "${example}"`);
        });
      }
    }

    // Platform-specific guidelines
    if (this.platform) {
      const platformInfo = PLATFORM_CONSTRAINTS[this.platform];
      sections.push('\n## Platform-Specific Guidelines');
      sections.push(`Platform: ${this.platform.charAt(0).toUpperCase() + this.platform.slice(1)}`);
      sections.push(`Format: ${platformInfo.format}`);

      if (platformInfo.maxLength) {
        sections.push(`Maximum length: ${platformInfo.maxLength} characters`);
      }

      sections.push('\nBest practices:');
      platformInfo.bestPractices.forEach((practice) => {
        sections.push(`- ${practice}`);
      });
    }

    // Product context
    if (this.product) {
      sections.push('\n## Product Context');
      sections.push(`Product: ${this.product.name}`);
      sections.push(`Description: ${this.product.description}`);
      sections.push(`Target Audience: ${this.product.targetAudience}`);
      sections.push(`Unique Value Proposition: ${this.product.uniqueValue}`);
    }

    // Content length guidelines
    if (this.length) {
      const lengthInfo = LENGTH_GUIDELINES[this.length];
      sections.push('\n## Length Requirements');
      sections.push(`Target length: ${lengthInfo.words}`);
      sections.push(`Approach: ${lengthInfo.description}`);
    }

    // General content guidelines
    sections.push('\n## Content Creation Guidelines');
    sections.push('- Ensure content is authentic and aligns with the brand voice');
    sections.push('- Focus on providing value to the audience');
    sections.push('- Use clear, compelling language');
    sections.push('- Include a clear call-to-action when appropriate');
    sections.push('- Optimize for engagement and shareability');
    sections.push('- Ensure accuracy and factual correctness');
    sections.push('- Avoid generic or cliché marketing language');

    return sections.join('\n');
  }

  /**
   * Builds the user prompt with specific requirements
   */
  buildUserPrompt(): string {
    const sections: string[] = [];

    // Content type and topic
    if (this.contentType && this.topic) {
      sections.push(
        `Create a ${this.contentType} about: ${this.topic}`
      );
    } else if (this.topic) {
      sections.push(`Create content about: ${this.topic}`);
    } else {
      throw new Error('Topic is required to build user prompt');
    }

    // Platform specification
    if (this.platform) {
      sections.push(`\nTarget platform: ${this.platform}`);
    }

    // Keywords for SEO
    if (this.keywords.length > 0) {
      sections.push(`\nKeywords to incorporate naturally: ${this.keywords.join(', ')}`);
    }

    // Content type specific requirements
    if (this.contentType) {
      sections.push('\n## Requirements');
      switch (this.contentType) {
        case 'post':
          sections.push('- Create a single, standalone post');
          sections.push('- Include a strong hook to capture attention');
          sections.push('- End with an engaging call-to-action');
          break;
        case 'thread':
          sections.push('- Structure as a multi-part thread (3-7 posts)');
          sections.push('- Each post should flow logically to the next');
          sections.push('- Start with a compelling hook');
          sections.push('- End with a strong conclusion and CTA');
          break;
        case 'story':
          sections.push('- Create a narrative-driven story format');
          sections.push('- Use emotional connection and storytelling elements');
          sections.push('- Include relatable scenarios or examples');
          break;
        case 'article':
          sections.push('- Create well-structured, informative content');
          sections.push('- Include introduction, body, and conclusion');
          sections.push('- Use subheadings if appropriate');
          sections.push('- Provide actionable insights or takeaways');
          break;
        case 'announcement':
          sections.push('- Clear and direct communication');
          sections.push('- Highlight key information prominently');
          sections.push('- Include relevant details (dates, links, etc.)');
          sections.push('- Create excitement and urgency when appropriate');
          break;
      }
    }

    // Additional instructions
    sections.push('\n## Output Format');
    sections.push('Provide only the final content, ready to post.');
    sections.push('Do not include explanations, meta-commentary, or labels.');
    sections.push('Format the content exactly as it should appear on the platform.');

    return sections.join('\n');
  }

  /**
   * Validates that all required fields are set
   */
  private validate(): void {
    if (!this.topic) {
      throw new Error('Topic is required. Use withTopic() to set it.');
    }
  }

  /**
   * Builds both system and user prompts and returns them as an object
   */
  build(): { systemPrompt: string; userPrompt: string } {
    this.validate();
    return {
      systemPrompt: this.buildSystemPrompt(),
      userPrompt: this.buildUserPrompt(),
    };
  }

  /**
   * Resets the builder to its initial state
   */
  reset(): this {
    this.platform = undefined;
    this.brandVoice = undefined;
    this.product = undefined;
    this.contentType = undefined;
    this.topic = undefined;
    this.keywords = [];
    this.length = undefined;
    return this;
  }

  /**
   * Creates a clone of the current builder
   */
  clone(): PromptBuilder {
    const cloned = new PromptBuilder();
    cloned.platform = this.platform;
    cloned.brandVoice = this.brandVoice ? { ...this.brandVoice } : undefined;
    cloned.product = this.product ? { ...this.product } : undefined;
    cloned.contentType = this.contentType;
    cloned.topic = this.topic;
    cloned.keywords = [...this.keywords];
    cloned.length = this.length;
    return cloned;
  }
}
