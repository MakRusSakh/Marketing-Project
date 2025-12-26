import { ClaudeClient } from './claude-client';

/**
 * Supported social media platforms
 */
export type Platform = 'twitter' | 'linkedin' | 'telegram' | 'discord' | 'vk' | 'instagram';

/**
 * Result of content adaptation between platforms
 */
export interface AdaptedContent {
  original: string;
  adapted: string;
  changes: string[];
  sourcePlatform: Platform;
  targetPlatform: Platform;
}

/**
 * Result of content optimization for engagement
 */
export interface OptimizedContent {
  original: string;
  optimized: string;
  improvements: string[];
  expectedEngagementBoost: number; // 0-100
}

/**
 * Result of splitting content into thread posts
 */
export interface ThreadSplit {
  posts: string[];
  connectors: string[]; // text connecting posts (e.g., "🧵 1/5")
  totalPosts: number;
}

/**
 * Platform-specific constraints and characteristics
 */
const PLATFORM_CHARACTERISTICS = {
  twitter: {
    maxLength: 280,
    style: 'concise, punchy, and impactful',
    format: 'short-form microblogging',
    hashtagLimit: 3,
    emojis: 'moderate use',
    tone: 'casual to professional, depending on brand',
    bestPractices: [
      'Use strong hooks in the first line',
      'Line breaks for readability',
      'Strategic hashtag placement',
      'Questions and CTAs for engagement',
    ],
  },
  linkedin: {
    maxLength: 3000,
    style: 'professional, insightful, and value-driven',
    format: 'professional networking post',
    hashtagLimit: 5,
    emojis: 'minimal, professional use',
    tone: 'professional and authoritative',
    bestPractices: [
      'Lead with valuable insights',
      'Use industry terminology appropriately',
      'Include actionable takeaways',
      'Professional storytelling',
    ],
  },
  telegram: {
    maxLength: 4096,
    style: 'direct, conversational, and community-focused',
    format: 'messaging platform post',
    hashtagLimit: 0,
    emojis: 'moderate to frequent',
    tone: 'conversational and friendly',
    bestPractices: [
      'Direct communication style',
      'Community-oriented language',
      'Clear formatting with line breaks',
      'Call out important information',
    ],
  },
  discord: {
    maxLength: 2000,
    style: 'casual, engaging, and community-driven',
    format: 'community chat message',
    hashtagLimit: 0,
    emojis: 'frequent use, including custom emojis',
    tone: 'casual and conversational',
    bestPractices: [
      'Conversational and approachable',
      'Encourage community interaction',
      'Use Discord-specific formatting (bold, italic, code blocks)',
      'Reference community members and roles',
    ],
  },
  vk: {
    maxLength: 16384,
    style: 'engaging, visual, and culturally localized',
    format: 'social network post',
    hashtagLimit: 10,
    emojis: 'moderate use',
    tone: 'friendly and engaging',
    bestPractices: [
      'Localized content approach',
      'Community-oriented messaging',
      'Visual descriptions',
      'Hashtags for discoverability',
    ],
  },
  instagram: {
    maxLength: 2200,
    style: 'visual-first, engaging, and lifestyle-oriented',
    format: 'visual social media caption',
    hashtagLimit: 30,
    emojis: 'frequent and creative use',
    tone: 'casual, authentic, and aspirational',
    bestPractices: [
      'Lead with compelling caption',
      'Describe visual context',
      'Use strategic line breaks',
      'Hashtag block at the end',
      'Strong calls-to-action through questions',
    ],
  },
} as const;

/**
 * PlatformAdapter class for adapting content between social media platforms
 * and optimizing content for platform-specific engagement
 */
export class PlatformAdapter {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new PlatformAdapter instance
   * @param claudeClient - ClaudeClient instance for AI operations
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Adapts content from one platform to another
   * @param content - Original content to adapt
   * @param source - Source platform
   * @param target - Target platform
   * @returns Adapted content with changes documented
   */
  async adaptForPlatform(
    content: string,
    source: Platform,
    target: Platform
  ): Promise<AdaptedContent> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    if (source === target) {
      return {
        original: content,
        adapted: content,
        changes: ['No changes needed - source and target platforms are the same'],
        sourcePlatform: source,
        targetPlatform: target,
      };
    }

    const systemPrompt = this.buildAdaptationSystemPrompt(source, target);
    const userPrompt = this.buildAdaptationUserPrompt(content, source, target);

    const result = await this.claudeClient.generateWithSystem(
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxTokens: 2048 }
    );

    return this.parseAdaptationResult(result.content, content, source, target);
  }

  /**
   * Optimizes content for maximum engagement on a specific platform
   * @param content - Original content to optimize
   * @param platform - Target platform
   * @returns Optimized content with improvements documented
   */
  async optimizeForEngagement(
    content: string,
    platform: Platform
  ): Promise<OptimizedContent> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    const systemPrompt = this.buildOptimizationSystemPrompt(platform);
    const userPrompt = this.buildOptimizationUserPrompt(content, platform);

    const result = await this.claudeClient.generateWithSystem(
      systemPrompt,
      userPrompt,
      { temperature: 0.8, maxTokens: 2048 }
    );

    return this.parseOptimizationResult(result.content, content);
  }

  /**
   * Splits long content into multiple thread posts for a platform
   * @param content - Content to split into thread
   * @param platform - Target platform
   * @param maxPosts - Maximum number of posts (optional, defaults to platform-appropriate number)
   * @returns Thread split with individual posts and connectors
   */
  async splitToThread(
    content: string,
    platform: Platform,
    maxPosts?: number
  ): Promise<ThreadSplit> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    const systemPrompt = this.buildThreadSplitSystemPrompt(platform);
    const userPrompt = this.buildThreadSplitUserPrompt(content, platform, maxPosts);

    const result = await this.claudeClient.generateWithSystem(
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxTokens: 3072 }
    );

    return this.parseThreadSplitResult(result.content, platform);
  }

  /**
   * Builds system prompt for content adaptation
   */
  private buildAdaptationSystemPrompt(source: Platform, target: Platform): string {
    const sourceInfo = PLATFORM_CHARACTERISTICS[source];
    const targetInfo = PLATFORM_CHARACTERISTICS[target];

    return `You are an expert social media content adapter specializing in platform-specific content transformation.

Your task is to adapt content from ${source} to ${target} while preserving the core message but optimizing for the target platform's unique characteristics.

## Source Platform: ${source.toUpperCase()}
- Style: ${sourceInfo.style}
- Format: ${sourceInfo.format}
- Max Length: ${sourceInfo.maxLength} characters
- Emoji Usage: ${sourceInfo.emojis}
- Tone: ${sourceInfo.tone}

## Target Platform: ${target.toUpperCase()}
- Style: ${targetInfo.style}
- Format: ${targetInfo.format}
- Max Length: ${targetInfo.maxLength} characters
- Emoji Usage: ${targetInfo.emojis}
- Tone: ${targetInfo.tone}
- Best Practices: ${targetInfo.bestPractices.join('; ')}

## Adaptation Guidelines
1. Preserve the core message and key information
2. Adjust tone and style to match target platform
3. Modify length to fit target platform constraints
4. Adapt formatting conventions (hashtags, emojis, line breaks)
5. Ensure content feels native to the target platform
6. Maintain brand voice while adapting platform style

## Output Format
Provide your response in the following format:

ADAPTED_CONTENT:
[The adapted content ready to post on ${target}]

CHANGES:
- [Change 1: Description of what was changed and why]
- [Change 2: Description of what was changed and why]
- [Continue listing all significant changes]

Be specific about changes made and ensure the adapted content is ready to post.`;
  }

  /**
   * Builds user prompt for content adaptation
   */
  private buildAdaptationUserPrompt(
    content: string,
    source: Platform,
    target: Platform
  ): string {
    return `Adapt the following content from ${source} to ${target}:

${content}

Ensure the adapted content:
1. Maintains the core message
2. Fits ${target}'s character limit and style
3. Uses appropriate formatting for ${target}
4. Feels native to ${target} users
5. Optimizes for engagement on ${target}

Provide the adapted content and a detailed list of changes made.`;
  }

  /**
   * Builds system prompt for content optimization
   */
  private buildOptimizationSystemPrompt(platform: Platform): string {
    const platformInfo = PLATFORM_CHARACTERISTICS[platform];

    return `You are an expert social media engagement specialist focusing on ${platform}.

Your task is to optimize content for maximum engagement while maintaining authenticity and value.

## Platform: ${platform.toUpperCase()}
- Style: ${platformInfo.style}
- Format: ${platformInfo.format}
- Max Length: ${platformInfo.maxLength} characters
- Emoji Usage: ${platformInfo.emojis}
- Tone: ${platformInfo.tone}

## Best Practices
${platformInfo.bestPractices.map((practice, i) => `${i + 1}. ${practice}`).join('\n')}

## Optimization Focus Areas
1. Hook/Opening: Make the first line irresistible
2. Value Proposition: Clarify the benefit to the reader
3. Readability: Improve formatting and flow
4. Engagement Triggers: Add questions, CTAs, or conversation starters
5. Keywords & Hashtags: Optimize for discoverability (within platform limits)
6. Emotional Connection: Enhance relatability and impact

## Engagement Estimation
Provide a realistic engagement boost estimate (0-100%) based on:
- Hook strength improvement
- Value clarity enhancement
- Readability improvements
- Engagement trigger additions
- Overall platform optimization

## Output Format
Provide your response in the following format:

OPTIMIZED_CONTENT:
[The optimized content ready to post]

IMPROVEMENTS:
- [Improvement 1: What was improved and why it boosts engagement]
- [Improvement 2: What was improved and why it boosts engagement]
- [Continue listing all improvements]

ENGAGEMENT_BOOST: [Number from 0-100 representing expected engagement increase percentage]

Be honest about the engagement boost estimate - not all content can be dramatically improved.`;
  }

  /**
   * Builds user prompt for content optimization
   */
  private buildOptimizationUserPrompt(content: string, platform: Platform): string {
    return `Optimize the following ${platform} content for maximum engagement:

${content}

Analyze the content and provide:
1. An optimized version that maintains the core message
2. Specific improvements made
3. Realistic engagement boost estimate

Focus on making the content more engaging while keeping it authentic and valuable.`;
  }

  /**
   * Builds system prompt for thread splitting
   */
  private buildThreadSplitSystemPrompt(platform: Platform): string {
    const platformInfo = PLATFORM_CHARACTERISTICS[platform];

    return `You are an expert at creating engaging thread posts for ${platform}.

Your task is to split long-form content into a compelling thread that maximizes readability and engagement.

## Platform: ${platform.toUpperCase()}
- Style: ${platformInfo.style}
- Format: ${platformInfo.format}
- Max Length per Post: ${platformInfo.maxLength} characters
- Emoji Usage: ${platformInfo.emojis}

## Thread Creation Guidelines
1. Each post should be self-contained yet flow naturally to the next
2. Start with a compelling hook that makes people want to read more
3. Maintain logical flow and narrative structure
4. Use appropriate connectors (e.g., "1/5", "🧵", "Thread 👇")
5. Ensure each post is under the character limit with room for connectors
6. End with a strong conclusion that ties everything together

## Post Structure Best Practices
- Post 1 (Hook): Grab attention, promise value, create curiosity
- Middle Posts: Deliver on the promise, build value, maintain interest
- Final Post: Conclude, summarize key points, include CTA

## Output Format
Provide your response in the following format:

POST_1:
[First post content]

POST_2:
[Second post content]

POST_3:
[Third post content]

[Continue for all posts...]

CONNECTORS:
[Connector for post 1 (e.g., "1/5")]
[Connector for post 2 (e.g., "2/5")]
[Continue for all posts...]

Each post should be ready to publish with the connector appended.`;
  }

  /**
   * Builds user prompt for thread splitting
   */
  private buildThreadSplitUserPrompt(
    content: string,
    platform: Platform,
    maxPosts?: number
  ): string {
    const maxPostsGuidance = maxPosts
      ? `Split into ${maxPosts} posts maximum.`
      : `Split into an appropriate number of posts (typically 3-10 posts).`;

    return `Split the following content into a ${platform} thread:

${content}

${maxPostsGuidance}

Requirements:
1. Create engaging, self-contained posts that flow together
2. Each post must be under ${PLATFORM_CHARACTERISTICS[platform].maxLength} characters (including room for connectors)
3. Start with a compelling hook
4. Maintain logical progression
5. End with a strong conclusion

Provide each post and the connectors to use.`;
  }

  /**
   * Parses adaptation result from AI response
   */
  private parseAdaptationResult(
    response: string,
    originalContent: string,
    source: Platform,
    target: Platform
  ): AdaptedContent {
    const adaptedMatch = response.match(/ADAPTED_CONTENT:\s*([\s\S]*?)(?=CHANGES:|$)/i);
    const changesMatch = response.match(/CHANGES:\s*([\s\S]*?)$/i);

    const adapted = adaptedMatch
      ? adaptedMatch[1].trim()
      : response.trim();

    const changesText = changesMatch ? changesMatch[1].trim() : '';
    const changes = changesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))
      .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''));

    return {
      original: originalContent,
      adapted: adapted,
      changes: changes.length > 0 ? changes : ['Content adapted for target platform'],
      sourcePlatform: source,
      targetPlatform: target,
    };
  }

  /**
   * Parses optimization result from AI response
   */
  private parseOptimizationResult(
    response: string,
    originalContent: string
  ): OptimizedContent {
    const optimizedMatch = response.match(/OPTIMIZED_CONTENT:\s*([\s\S]*?)(?=IMPROVEMENTS:|$)/i);
    const improvementsMatch = response.match(/IMPROVEMENTS:\s*([\s\S]*?)(?=ENGAGEMENT_BOOST:|$)/i);
    const boostMatch = response.match(/ENGAGEMENT_BOOST:\s*(\d+)/i);

    const optimized = optimizedMatch
      ? optimizedMatch[1].trim()
      : response.split('IMPROVEMENTS:')[0].trim();

    const improvementsText = improvementsMatch ? improvementsMatch[1].trim() : '';
    const improvements = improvementsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))
      .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''));

    const engagementBoost = boostMatch
      ? Math.min(100, Math.max(0, parseInt(boostMatch[1], 10)))
      : 15; // Default conservative estimate

    return {
      original: originalContent,
      optimized: optimized,
      improvements: improvements.length > 0 ? improvements : ['Content optimized for engagement'],
      expectedEngagementBoost: engagementBoost,
    };
  }

  /**
   * Parses thread split result from AI response
   */
  private parseThreadSplitResult(response: string, platform: Platform): ThreadSplit {
    const posts: string[] = [];
    const connectors: string[] = [];

    // Extract posts
    const postMatches = response.matchAll(/POST_(\d+):\s*([\s\S]*?)(?=POST_\d+:|CONNECTORS:|$)/gi);
    for (const match of postMatches) {
      const postContent = match[2].trim();
      if (postContent) {
        posts.push(postContent);
      }
    }

    // Extract connectors
    const connectorsMatch = response.match(/CONNECTORS:\s*([\s\S]*?)$/i);
    if (connectorsMatch) {
      const connectorLines = connectorsMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      connectors.push(...connectorLines);
    }

    // If parsing failed, try to split the content intelligently
    if (posts.length === 0) {
      const lines = response.split('\n').filter(line => line.trim().length > 0);

      // Simple fallback: treat each substantial paragraph as a post
      let currentPost = '';
      for (const line of lines) {
        if (line.match(/^(POST_\d+:|CONNECTORS:)/i)) {
          continue;
        }

        if (currentPost.length + line.length < PLATFORM_CHARACTERISTICS[platform].maxLength - 50) {
          currentPost += (currentPost ? '\n' : '') + line;
        } else {
          if (currentPost) {
            posts.push(currentPost);
          }
          currentPost = line;
        }
      }

      if (currentPost) {
        posts.push(currentPost);
      }
    }

    // Generate connectors if not provided
    if (connectors.length < posts.length) {
      const totalPosts = posts.length;
      for (let i = 0; i < totalPosts; i++) {
        if (i < connectors.length) {
          continue;
        }

        // Platform-specific connector style
        if (platform === 'twitter' || platform === 'linkedin') {
          connectors.push(`${i + 1}/${totalPosts}`);
        } else if (platform === 'instagram') {
          connectors.push(i === 0 ? '👇' : `${i + 1}/${totalPosts}`);
        } else {
          connectors.push(`[${i + 1}/${totalPosts}]`);
        }
      }
    }

    return {
      posts,
      connectors: connectors.slice(0, posts.length),
      totalPosts: posts.length,
    };
  }
}
