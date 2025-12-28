import { ClaudeClient } from './claude-client';
import { BrandVoice, ProductContext } from './prompt-builder';

/**
 * Supported social media platforms
 */
export type Platform = 'twitter' | 'linkedin' | 'telegram' | 'discord' | 'vk' | 'instagram';

/**
 * Options for thread generation
 */
export interface ThreadOptions {
  brandVoice?: BrandVoice;
  product?: ProductContext;
  includeHook?: boolean;
  includeConclusion?: boolean;
  includeCTA?: boolean;
  style?: 'educational' | 'storytelling' | 'tips' | 'breakdown';
}

/**
 * Generated thread with all components
 */
export interface GeneratedThread {
  hook: string;
  mainPosts: string[];
  conclusion: string;
  callToAction?: string;
  metadata: {
    totalCharacters: number;
    estimatedReadTime: number;
    hashtags: string[];
  };
}

/**
 * Platform-specific characteristics for thread generation
 */
const PLATFORM_THREAD_CHARACTERISTICS = {
  twitter: {
    maxPostLength: 280,
    recommendedPosts: '3-7 posts',
    threadStyle: 'Concise, punchy, with strong hooks. Each tweet should deliver value.',
    connectorStyle: '🧵 Thread emoji or numbered (1/5)',
    hashtagApproach: 'Use sparingly, 1-2 per post max',
  },
  linkedin: {
    maxPostLength: 3000,
    recommendedPosts: '3-5 posts',
    threadStyle: 'Professional, insightful, each post should be substantial and valuable.',
    connectorStyle: 'Numbered (Post 1/5) or continuation phrases',
    hashtagApproach: 'Use 3-5 relevant hashtags, typically at the end',
  },
  telegram: {
    maxPostLength: 4096,
    recommendedPosts: '2-5 posts',
    threadStyle: 'Conversational, direct, community-focused. Each message should be clear.',
    connectorStyle: 'Message numbers or continuation text',
    hashtagApproach: 'Hashtags not commonly used',
  },
  discord: {
    maxPostLength: 2000,
    recommendedPosts: '2-4 posts',
    threadStyle: 'Casual, engaging, uses Discord formatting (bold, code blocks, etc.)',
    connectorStyle: 'Numbered messages or emojis',
    hashtagApproach: 'Hashtags not used',
  },
  vk: {
    maxPostLength: 16384,
    recommendedPosts: '2-4 posts',
    threadStyle: 'Engaging, visual descriptions, community-oriented.',
    connectorStyle: 'Numbered posts or continuation phrases',
    hashtagApproach: 'Use hashtags for discoverability, 5-10 per post',
  },
  instagram: {
    maxPostLength: 2200,
    recommendedPosts: '3-5 posts',
    threadStyle: 'Visual-first captions, authentic and engaging. Describe visual context.',
    connectorStyle: 'Carousel post references or numbered',
    hashtagApproach: 'Use up to 30 hashtags, create hashtag blocks',
  },
} as const;

/**
 * ThreadGenerator class for creating engaging thread content
 */
export class ThreadGenerator {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new ThreadGenerator instance
   * @param claudeClient - ClaudeClient instance for AI operations
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Generates a complete thread from a topic
   * @param topic - Topic to create thread about
   * @param platform - Target platform
   * @param postsCount - Number of posts to generate
   * @param options - Additional thread options
   * @returns Generated thread with all components
   */
  async generateThread(
    topic: string,
    platform: Platform,
    postsCount: number,
    options?: ThreadOptions
  ): Promise<GeneratedThread> {
    if (!topic || topic.trim().length === 0) {
      throw new Error('Topic cannot be empty');
    }

    if (postsCount < 2 || postsCount > 20) {
      throw new Error('Posts count must be between 2 and 20');
    }

    const systemPrompt = this.buildThreadGenerationSystemPrompt(platform, postsCount, options);
    const userPrompt = this.buildThreadGenerationUserPrompt(topic, platform, postsCount, options);

    const result = await this.claudeClient.generateWithSystem(
      systemPrompt,
      userPrompt,
      { temperature: 0.8, maxTokens: 4096 }
    );

    return this.parseGeneratedThread(result.content, platform);
  }

  /**
   * Expands a short post into a full thread
   * @param shortPost - Short post to expand
   * @param platform - Target platform
   * @param targetPosts - Number of posts to expand into
   * @returns Generated thread
   */
  async expandToThread(
    shortPost: string,
    platform: Platform,
    targetPosts: number
  ): Promise<GeneratedThread> {
    if (!shortPost || shortPost.trim().length === 0) {
      throw new Error('Short post cannot be empty');
    }

    if (targetPosts < 2 || targetPosts > 20) {
      throw new Error('Target posts must be between 2 and 20');
    }

    const systemPrompt = this.buildExpansionSystemPrompt(platform, targetPosts);
    const userPrompt = this.buildExpansionUserPrompt(shortPost, platform, targetPosts);

    const result = await this.claudeClient.generateWithSystem(
      systemPrompt,
      userPrompt,
      { temperature: 0.8, maxTokens: 4096 }
    );

    return this.parseGeneratedThread(result.content, platform);
  }

  /**
   * Generates an engaging hook for a thread
   * @param topic - Topic of the thread
   * @param platform - Target platform
   * @returns Engaging hook text
   */
  async generateHook(topic: string, platform: Platform): Promise<string> {
    if (!topic || topic.trim().length === 0) {
      throw new Error('Topic cannot be empty');
    }

    const systemPrompt = this.buildHookGenerationSystemPrompt(platform);
    const userPrompt = this.buildHookGenerationUserPrompt(topic, platform);

    const result = await this.claudeClient.generateWithSystem(
      systemPrompt,
      userPrompt,
      { temperature: 0.9, maxTokens: 512 }
    );

    return result.content.trim();
  }

  /**
   * Generates a conclusion post for a thread
   * @param threadContext - Context from the thread (summary of main posts)
   * @param platform - Target platform
   * @returns Conclusion post text
   */
  async generateConclusion(threadContext: string, platform: Platform): Promise<string> {
    if (!threadContext || threadContext.trim().length === 0) {
      throw new Error('Thread context cannot be empty');
    }

    const systemPrompt = this.buildConclusionGenerationSystemPrompt(platform);
    const userPrompt = this.buildConclusionGenerationUserPrompt(threadContext, platform);

    const result = await this.claudeClient.generateWithSystem(
      systemPrompt,
      userPrompt,
      { temperature: 0.7, maxTokens: 512 }
    );

    return result.content.trim();
  }

  /**
   * Builds system prompt for thread generation
   */
  private buildThreadGenerationSystemPrompt(
    platform: Platform,
    postsCount: number,
    options?: ThreadOptions
  ): string {
    const platformInfo = PLATFORM_THREAD_CHARACTERISTICS[platform];
    const style = options?.style || 'educational';

    let systemPrompt = `You are an expert social media thread creator specializing in ${platform}.

Your task is to create a ${postsCount}-post thread that is engaging, valuable, and optimized for ${platform}.

## Platform: ${platform.toUpperCase()}
- Max Length per Post: ${platformInfo.maxPostLength} characters
- Thread Style: ${platformInfo.threadStyle}
- Recommended Posts: ${platformInfo.recommendedPosts}
- Hashtag Approach: ${platformInfo.hashtagApproach}

## Thread Style: ${style.toUpperCase()}
`;

    // Add style-specific guidance
    switch (style) {
      case 'educational':
        systemPrompt += `- Focus on teaching and providing valuable insights
- Break down complex topics into digestible pieces
- Use examples and explanations
- Provide actionable takeaways\n`;
        break;
      case 'storytelling':
        systemPrompt += `- Use narrative structure with beginning, middle, and end
- Include emotional elements and character development
- Build tension and resolution
- Make it relatable and engaging\n`;
        break;
      case 'tips':
        systemPrompt += `- Provide practical, actionable advice
- Number tips for easy scanning
- Include specific examples
- Focus on immediate value\n`;
        break;
      case 'breakdown':
        systemPrompt += `- Analyze a complex topic systematically
- Break into logical components
- Explain each part clearly
- Show how parts connect\n`;
        break;
    }

    // Add brand voice if provided
    if (options?.brandVoice) {
      systemPrompt += `\n## Brand Voice
- Tone: ${options.brandVoice.tone}
- Style: ${options.brandVoice.style}
- Preferred Vocabulary: ${options.brandVoice.vocabulary.join(', ')}
- Avoid: ${options.brandVoice.avoidWords.join(', ')}\n`;
    }

    // Add product context if provided
    if (options?.product) {
      systemPrompt += `\n## Product Context
- Product: ${options.product.name}
- Description: ${options.product.description}
- Target Audience: ${options.product.targetAudience}
- Unique Value: ${options.product.uniqueValue}\n`;
    }

    systemPrompt += `\n## Thread Structure Requirements
${options?.includeHook !== false ? '1. HOOK: Create a compelling opening that grabs attention and promises value' : '1. Start with strong opening'}
2. MAIN POSTS: Deliver on the promise, build value progressively (${postsCount - 2} posts)
${options?.includeConclusion !== false ? '3. CONCLUSION: Tie everything together with key takeaways' : '3. End with strong closing'}
${options?.includeCTA !== false ? '4. CTA: Include a clear call-to-action' : ''}

## Quality Guidelines
- Each post must be valuable on its own
- Posts should flow naturally from one to the next
- Stay under ${platformInfo.maxPostLength} characters per post
- Use engaging language and formatting
- Include relevant hashtags where appropriate
- Make every word count

## Output Format
Provide your response in this exact format:

HOOK:
[Compelling opening post]

POST_2:
[Second post content]

POST_3:
[Third post content]

[Continue for all ${postsCount} posts...]

CONCLUSION:
[Final post that ties everything together]

${options?.includeCTA !== false ? 'CTA:\n[Clear call-to-action]' : ''}

HASHTAGS:
[Comma-separated list of relevant hashtags]

Each post should be complete and ready to publish.`;

    return systemPrompt;
  }

  /**
   * Builds user prompt for thread generation
   */
  private buildThreadGenerationUserPrompt(
    topic: string,
    platform: Platform,
    postsCount: number,
    options?: ThreadOptions
  ): string {
    let prompt = `Create a ${postsCount}-post ${platform} thread about: ${topic}`;

    if (options?.style) {
      prompt += `\n\nUse a ${options.style} approach to make the thread engaging and valuable.`;
    }

    if (options?.product) {
      prompt += `\n\nWeave in references to ${options.product.name} naturally where relevant.`;
    }

    prompt += `\n\nEnsure the thread:
1. Starts with a compelling hook that makes people want to read more
2. Delivers real value in each post
3. Maintains logical flow from post to post
4. Ends with a strong conclusion`;

    if (options?.includeCTA !== false) {
      prompt += `\n5. Includes a clear call-to-action`;
    }

    prompt += `\n\nProvide the complete thread ready to post.`;

    return prompt;
  }

  /**
   * Builds system prompt for expansion
   */
  private buildExpansionSystemPrompt(platform: Platform, targetPosts: number): string {
    const platformInfo = PLATFORM_THREAD_CHARACTERISTICS[platform];

    return `You are an expert at expanding short content into engaging ${platform} threads.

Your task is to take a short post and expand it into a ${targetPosts}-post thread while:
1. Preserving the core message and intent
2. Adding depth, context, and value
3. Maintaining the original voice and tone
4. Creating natural flow between posts

## Platform: ${platform.toUpperCase()}
- Max Length per Post: ${platformInfo.maxPostLength} characters
- Thread Style: ${platformInfo.threadStyle}
- Hashtag Approach: ${platformInfo.hashtagApproach}

## Expansion Strategy
- Identify the key insight or message in the original post
- Break it down into supporting points or examples
- Add context, explanations, or stories
- Create a natural narrative flow
- Ensure each post adds value

## Output Format
Provide your response in this exact format:

HOOK:
[Expanded opening based on original post]

POST_2:
[Second post with supporting content]

POST_3:
[Third post continuing the narrative]

[Continue for all ${targetPosts} posts...]

CONCLUSION:
[Conclusion that ties back to the original message]

CTA:
[Call-to-action if appropriate]

HASHTAGS:
[Comma-separated list of relevant hashtags]`;
  }

  /**
   * Builds user prompt for expansion
   */
  private buildExpansionUserPrompt(
    shortPost: string,
    platform: Platform,
    targetPosts: number
  ): string {
    return `Expand the following short post into a ${targetPosts}-post ${platform} thread:

"${shortPost}"

Requirements:
1. Preserve the core message and tone
2. Add depth, examples, and context
3. Create natural flow between posts
4. Each post should be valuable on its own
5. Expand to exactly ${targetPosts} posts

Provide the complete expanded thread.`;
  }

  /**
   * Builds system prompt for hook generation
   */
  private buildHookGenerationSystemPrompt(platform: Platform): string {
    const platformInfo = PLATFORM_THREAD_CHARACTERISTICS[platform];

    return `You are an expert at creating compelling hooks for ${platform} threads.

Your task is to create an opening post that:
1. Immediately grabs attention
2. Creates curiosity or urgency
3. Promises clear value
4. Makes people want to read the thread
5. Sets the tone for what follows

## Platform: ${platform.toUpperCase()}
- Max Length: ${platformInfo.maxPostLength} characters
- Style: ${platformInfo.threadStyle}

## Hook Techniques
- Start with a surprising statistic or fact
- Ask a thought-provoking question
- Share a bold statement or controversial take
- Tell the beginning of an interesting story
- Highlight a common problem or pain point
- Promise a specific benefit or solution

## Quality Criteria
- Clear and concise
- Creates curiosity or interest
- Relevant to the target audience
- Authentic, not clickbait
- Sets expectations for the thread

Provide only the hook text, ready to post.`;
  }

  /**
   * Builds user prompt for hook generation
   */
  private buildHookGenerationUserPrompt(topic: string, platform: Platform): string {
    return `Create a compelling hook for a ${platform} thread about: ${topic}

The hook should:
1. Immediately grab attention
2. Make people want to read more
3. Promise clear value
4. Be authentic and not clickbait

Provide only the hook text, ready to post.`;
  }

  /**
   * Builds system prompt for conclusion generation
   */
  private buildConclusionGenerationSystemPrompt(platform: Platform): string {
    const platformInfo = PLATFORM_THREAD_CHARACTERISTICS[platform];

    return `You are an expert at creating powerful conclusions for ${platform} threads.

Your task is to create a conclusion post that:
1. Ties together the main points from the thread
2. Reinforces the key message or takeaway
3. Provides a sense of completion
4. Includes a clear call-to-action
5. Leaves a lasting impression

## Platform: ${platform.toUpperCase()}
- Max Length: ${platformInfo.maxPostLength} characters
- Style: ${platformInfo.threadStyle}

## Conclusion Elements
- Summarize key points briefly
- Emphasize the main takeaway
- Provide next steps or action items
- Include a relevant call-to-action
- End with impact

## Quality Criteria
- Concise but complete
- Reinforces thread value
- Clear action or reflection prompt
- Memorable closing

Provide only the conclusion text, ready to post.`;
  }

  /**
   * Builds user prompt for conclusion generation
   */
  private buildConclusionGenerationUserPrompt(threadContext: string, platform: Platform): string {
    return `Create a powerful conclusion for a ${platform} thread based on this context:

${threadContext}

The conclusion should:
1. Tie together the main points
2. Emphasize the key takeaway
3. Include a clear call-to-action
4. Leave a lasting impression

Provide only the conclusion text, ready to post.`;
  }

  /**
   * Parses generated thread from AI response
   */
  private parseGeneratedThread(response: string, platform: Platform): GeneratedThread {
    // Extract hook
    const hookMatch = response.match(/HOOK:\s*([\s\S]*?)(?=POST_2:|CONCLUSION:|$)/i);
    const hook = hookMatch ? hookMatch[1].trim() : '';

    // Extract main posts (excluding hook and conclusion)
    const mainPosts: string[] = [];
    const postMatches = response.matchAll(/POST_(\d+):\s*([\s\S]*?)(?=POST_\d+:|CONCLUSION:|CTA:|HASHTAGS:|$)/gi);

    for (const match of postMatches) {
      const postNumber = parseInt(match[1], 10);
      const postContent = match[2].trim();

      if (postContent && postNumber >= 2) {
        mainPosts.push(postContent);
      }
    }

    // Extract conclusion
    const conclusionMatch = response.match(/CONCLUSION:\s*([\s\S]*?)(?=CTA:|HASHTAGS:|$)/i);
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

    // Extract CTA
    const ctaMatch = response.match(/CTA:\s*([\s\S]*?)(?=HASHTAGS:|$)/i);
    const callToAction = ctaMatch ? ctaMatch[1].trim() : undefined;

    // Extract hashtags
    const hashtagsMatch = response.match(/HASHTAGS:\s*([\s\S]*?)$/i);
    const hashtagsText = hashtagsMatch ? hashtagsMatch[1].trim() : '';
    const hashtags = hashtagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

    // Calculate metadata
    const allPosts = [hook, ...mainPosts, conclusion].filter(p => p);
    const totalCharacters = allPosts.reduce((sum, post) => sum + post.length, 0);

    // Estimate read time (average reading speed: 200 words per minute)
    const totalWords = allPosts.reduce((sum, post) => {
      return sum + post.split(/\s+/).length;
    }, 0);
    const estimatedReadTime = Math.ceil(totalWords / 200);

    return {
      hook,
      mainPosts,
      conclusion,
      callToAction,
      metadata: {
        totalCharacters,
        estimatedReadTime,
        hashtags,
      },
    };
  }
}
