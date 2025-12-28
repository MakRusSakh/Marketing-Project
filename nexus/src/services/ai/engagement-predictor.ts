/**
 * Engagement Predictor Service
 * Predicts engagement metrics and provides content improvement suggestions
 */

import { ClaudeClient } from './claude-client';
import type { Platform } from './prompt-builder';

/**
 * Engagement prediction result with score and breakdown
 */
export interface EngagementPrediction {
  score: number; // 0-100
  confidence: number; // 0-100
  breakdown: {
    hook: number;
    clarity: number;
    emotion: number;
    callToAction: number;
    hashtags: number;
  };
  estimatedMetrics: {
    likes: 'low' | 'medium' | 'high' | 'viral';
    comments: 'low' | 'medium' | 'high' | 'viral';
    shares: 'low' | 'medium' | 'high' | 'viral';
    clicks: 'low' | 'medium' | 'high' | 'viral';
  };
}

/**
 * Improvement suggestion for specific content areas
 */
export interface ImprovementSuggestion {
  area: 'hook' | 'clarity' | 'emotion' | 'cta' | 'hashtags' | 'length' | 'format';
  currentScore: number;
  potentialScore: number;
  suggestion: string;
  example?: string;
}

/**
 * Comparison result for multiple post variants
 */
export interface PostComparison {
  rankings: Array<{
    postIndex: number;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  bestPost: number;
  recommendation: string;
}

/**
 * Posting time recommendation based on platform and timezone
 */
export interface PostingTimeRecommendation {
  bestHours: number[]; // 0-23
  bestDays: string[]; // 'Monday', 'Tuesday', etc.
  reasoning: string;
}

/**
 * EngagementPredictor class for analyzing and optimizing content performance
 */
export class EngagementPredictor {
  private claudeClient: ClaudeClient;

  /**
   * Creates a new EngagementPredictor instance
   * @param claudeClient - Claude AI client for analysis
   */
  constructor(claudeClient: ClaudeClient) {
    this.claudeClient = claudeClient;
  }

  /**
   * Predict engagement metrics for content
   * Analyzes content quality, structure, and platform fit
   * @param content - Content to analyze
   * @param platform - Target platform
   * @returns Engagement prediction with detailed breakdown
   */
  async predictEngagement(
    content: string,
    platform: Platform
  ): Promise<EngagementPrediction> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    const systemPrompt = `You are an expert social media analyst specializing in engagement prediction. Analyze content and predict its engagement potential.

Evaluate the content across these dimensions:
1. Hook (0-100): How well does it capture attention in the first few words?
2. Clarity (0-100): How clear and easy to understand is the message?
3. Emotion (0-100): How well does it evoke emotional response?
4. Call to Action (0-100): How effective is the CTA (if present)?
5. Hashtags (0-100): How relevant and effective are the hashtags?

Also estimate:
- Overall engagement score (0-100)
- Confidence in prediction (0-100)
- Expected performance levels (low/medium/high/viral) for likes, comments, shares, clicks

Provide your analysis in the following JSON format:
{
  "score": 75,
  "confidence": 85,
  "breakdown": {
    "hook": 80,
    "clarity": 75,
    "emotion": 70,
    "callToAction": 65,
    "hashtags": 80
  },
  "estimatedMetrics": {
    "likes": "high",
    "comments": "medium",
    "shares": "medium",
    "clicks": "high"
  }
}`;

    const userPrompt = `Analyze this ${platform} content and predict its engagement potential:

Content:
${content}

Platform: ${platform}

Provide your engagement prediction in the specified JSON format.`;

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3, // Lower temperature for consistent analysis
          maxTokens: 1500,
        }
      );

      return this.parsePredictionResponse(result.content);
    } catch (error) {
      throw new Error(
        `Failed to predict engagement: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Suggest improvements for content
   * Provides actionable recommendations to increase engagement
   * @param content - Content to analyze
   * @param platform - Target platform
   * @returns Array of improvement suggestions
   */
  async suggestImprovements(
    content: string,
    platform: Platform
  ): Promise<ImprovementSuggestion[]> {
    if (!content || content.trim().length === 0) {
      throw new Error('Content cannot be empty');
    }

    const systemPrompt = `You are an expert social media content optimizer. Analyze content and provide specific, actionable improvement suggestions.

For each area of improvement, specify:
- Area (hook, clarity, emotion, cta, hashtags, length, or format)
- Current score (0-100)
- Potential score after improvement (0-100)
- Specific suggestion for improvement
- Optional example of how to implement the suggestion

Focus on the top 3-5 most impactful improvements.

Provide your suggestions in the following JSON format:
{
  "suggestions": [
    {
      "area": "hook",
      "currentScore": 60,
      "potentialScore": 85,
      "suggestion": "Start with a question or surprising statement",
      "example": "Did you know that 70% of marketers struggle with this?"
    }
  ]
}`;

    const userPrompt = `Analyze this ${platform} content and provide improvement suggestions:

Content:
${content}

Platform: ${platform}

Provide specific, actionable suggestions in the specified JSON format.`;

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.4,
          maxTokens: 2000,
        }
      );

      return this.parseImprovementResponse(result.content);
    } catch (error) {
      throw new Error(
        `Failed to generate improvement suggestions: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Compare multiple post variants
   * Ranks posts by predicted engagement and identifies strengths/weaknesses
   * @param posts - Array of post variants to compare
   * @param platform - Target platform
   * @returns Comparison results with rankings and recommendations
   */
  async comparePosts(posts: string[], platform: Platform): Promise<PostComparison> {
    if (!posts || posts.length === 0) {
      throw new Error('At least one post is required for comparison');
    }

    if (posts.length === 1) {
      throw new Error('At least two posts are required for comparison');
    }

    // Filter out empty posts
    const validPosts = posts.filter((post) => post && post.trim().length > 0);

    if (validPosts.length < 2) {
      throw new Error('At least two valid posts are required for comparison');
    }

    const systemPrompt = `You are an expert social media analyst. Compare multiple post variants and rank them by predicted engagement potential.

For each post, identify:
- Engagement score (0-100)
- Top 2-3 strengths
- Top 2-3 weaknesses or areas for improvement

Then provide:
- Rankings from best to worst
- Index of the best performing post
- Overall recommendation

Provide your analysis in the following JSON format:
{
  "rankings": [
    {
      "postIndex": 0,
      "score": 85,
      "strengths": ["Strong hook", "Clear CTA", "Emotional appeal"],
      "weaknesses": ["Could use more hashtags", "Slightly long"]
    }
  ],
  "bestPost": 0,
  "recommendation": "Post 1 has the strongest hook and clearest message. Consider combining it with the hashtags from Post 2."
}`;

    const userPrompt = `Compare these ${platform} post variants and rank them by engagement potential:

${validPosts.map((post, idx) => `Post ${idx + 1}:\n${post}`).join('\n\n---\n\n')}

Platform: ${platform}

Provide your comparison in the specified JSON format.`;

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.3,
          maxTokens: 2500,
        }
      );

      return this.parseComparisonResponse(result.content);
    } catch (error) {
      throw new Error(
        `Failed to compare posts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Get best posting time recommendation
   * Provides platform-specific and timezone-aware posting time guidance
   * @param platform - Target platform
   * @param timezone - User's timezone (e.g., 'America/New_York', 'Europe/London')
   * @returns Posting time recommendation
   */
  async getBestPostingTime(
    platform: Platform,
    timezone: string
  ): Promise<PostingTimeRecommendation> {
    if (!timezone || timezone.trim().length === 0) {
      throw new Error('Timezone is required');
    }

    // Use platform-specific best practices combined with AI insights
    const platformDefaults = this.getPlatformTimingDefaults(platform);

    const systemPrompt = `You are a social media timing optimization expert. Provide posting time recommendations based on platform best practices and audience behavior patterns.

Consider:
- Platform-specific engagement patterns
- Time zone considerations
- Day of week variations
- Industry standards

Provide recommendations in the following JSON format:
{
  "bestHours": [9, 12, 15, 18],
  "bestDays": ["Monday", "Wednesday", "Thursday"],
  "reasoning": "Detailed explanation of why these times work best"
}`;

    const userPrompt = `Recommend the best posting times for ${platform} in the ${timezone} timezone.

Platform: ${platform}
Timezone: ${timezone}

Consider typical audience behavior patterns for this platform and timezone.

Provide your recommendation in the specified JSON format.`;

    try {
      const result = await this.claudeClient.generateWithSystem(
        systemPrompt,
        userPrompt,
        {
          temperature: 0.4,
          maxTokens: 1000,
        }
      );

      const recommendation = this.parseTimingResponse(result.content);

      // Validate and merge with platform defaults if needed
      return this.validateTimingRecommendation(recommendation, platformDefaults);
    } catch (error) {
      // If AI generation fails, return platform defaults
      return platformDefaults;
    }
  }

  /**
   * Parse engagement prediction response
   * @private
   */
  private parsePredictionResponse(content: string): EngagementPrediction {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize scores
      const prediction: EngagementPrediction = {
        score: this.clampScore(parsed.score),
        confidence: this.clampScore(parsed.confidence),
        breakdown: {
          hook: this.clampScore(parsed.breakdown?.hook),
          clarity: this.clampScore(parsed.breakdown?.clarity),
          emotion: this.clampScore(parsed.breakdown?.emotion),
          callToAction: this.clampScore(parsed.breakdown?.callToAction),
          hashtags: this.clampScore(parsed.breakdown?.hashtags),
        },
        estimatedMetrics: {
          likes: this.normalizeMetricLevel(parsed.estimatedMetrics?.likes),
          comments: this.normalizeMetricLevel(parsed.estimatedMetrics?.comments),
          shares: this.normalizeMetricLevel(parsed.estimatedMetrics?.shares),
          clicks: this.normalizeMetricLevel(parsed.estimatedMetrics?.clicks),
        },
      };

      return prediction;
    } catch (error) {
      throw new Error(
        `Failed to parse engagement prediction: ${
          error instanceof Error ? error.message : 'Invalid format'
        }`
      );
    }
  }

  /**
   * Parse improvement suggestions response
   * @private
   */
  private parseImprovementResponse(content: string): ImprovementSuggestion[] {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid suggestions format');
      }

      return parsed.suggestions.map((sug: any) => ({
        area: this.normalizeArea(sug.area),
        currentScore: this.clampScore(sug.currentScore),
        potentialScore: this.clampScore(sug.potentialScore),
        suggestion: sug.suggestion || '',
        example: sug.example,
      }));
    } catch (error) {
      throw new Error(
        `Failed to parse improvement suggestions: ${
          error instanceof Error ? error.message : 'Invalid format'
        }`
      );
    }
  }

  /**
   * Parse post comparison response
   * @private
   */
  private parseComparisonResponse(content: string): PostComparison {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed.rankings)) {
        throw new Error('Invalid rankings format');
      }

      return {
        rankings: parsed.rankings.map((rank: any) => ({
          postIndex: rank.postIndex || 0,
          score: this.clampScore(rank.score),
          strengths: Array.isArray(rank.strengths) ? rank.strengths : [],
          weaknesses: Array.isArray(rank.weaknesses) ? rank.weaknesses : [],
        })),
        bestPost: parsed.bestPost || 0,
        recommendation: parsed.recommendation || '',
      };
    } catch (error) {
      throw new Error(
        `Failed to parse post comparison: ${
          error instanceof Error ? error.message : 'Invalid format'
        }`
      );
    }
  }

  /**
   * Parse timing recommendation response
   * @private
   */
  private parseTimingResponse(content: string): PostingTimeRecommendation {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        bestHours: Array.isArray(parsed.bestHours)
          ? parsed.bestHours.filter((h: number) => h >= 0 && h <= 23)
          : [],
        bestDays: Array.isArray(parsed.bestDays) ? parsed.bestDays : [],
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      throw new Error(
        `Failed to parse timing recommendation: ${
          error instanceof Error ? error.message : 'Invalid format'
        }`
      );
    }
  }

  /**
   * Get platform-specific timing defaults
   * @private
   */
  private getPlatformTimingDefaults(platform: Platform): PostingTimeRecommendation {
    const defaults: Record<Platform, PostingTimeRecommendation> = {
      twitter: {
        bestHours: [9, 12, 15, 17],
        bestDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        reasoning:
          'Twitter sees peak engagement during business hours, especially mid-morning and mid-afternoon when professionals check their feeds during breaks.',
      },
      linkedin: {
        bestHours: [7, 8, 12, 17, 18],
        bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
        reasoning:
          'LinkedIn engagement peaks during commute times (7-8am, 5-6pm) and lunch breaks (12pm). Midweek posts typically perform best as professionals are most active.',
      },
      instagram: {
        bestHours: [11, 13, 19, 21],
        bestDays: ['Monday', 'Wednesday', 'Friday'],
        reasoning:
          'Instagram users are most active during lunch hours and evening relaxation time. Weekend engagement can also be strong depending on your audience.',
      },
      telegram: {
        bestHours: [8, 12, 18, 20],
        bestDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        reasoning:
          'Telegram communities are active throughout the day, with peaks in morning, lunch, and evening hours when users check their messages.',
      },
      discord: {
        bestHours: [14, 18, 20, 22],
        bestDays: ['Saturday', 'Sunday', 'Wednesday', 'Friday'],
        reasoning:
          'Discord communities are most active in afternoons and evenings, with strong weekend engagement as users have more free time for community interaction.',
      },
      vk: {
        bestHours: [10, 13, 18, 20],
        bestDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        reasoning:
          'VK users are active during lunch breaks and evening hours. Weekend engagement is also strong, particularly on Saturdays.',
      },
    };

    return defaults[platform] || defaults.twitter;
  }

  /**
   * Validate and normalize timing recommendation
   * @private
   */
  private validateTimingRecommendation(
    recommendation: PostingTimeRecommendation,
    defaults: PostingTimeRecommendation
  ): PostingTimeRecommendation {
    // Use defaults if AI recommendation is incomplete
    if (
      !recommendation.bestHours ||
      recommendation.bestHours.length === 0 ||
      !recommendation.bestDays ||
      recommendation.bestDays.length === 0
    ) {
      return defaults;
    }

    return {
      bestHours: recommendation.bestHours.slice(0, 5), // Limit to top 5 hours
      bestDays: recommendation.bestDays.slice(0, 5), // Limit to top 5 days
      reasoning: recommendation.reasoning || defaults.reasoning,
    };
  }

  /**
   * Clamp score to 0-100 range
   * @private
   */
  private clampScore(score: any): number {
    const num = typeof score === 'number' ? score : parseFloat(score) || 0;
    return Math.max(0, Math.min(100, num));
  }

  /**
   * Normalize metric level to valid values
   * @private
   */
  private normalizeMetricLevel(
    level: any
  ): 'low' | 'medium' | 'high' | 'viral' {
    const levelStr = String(level || 'medium').toLowerCase();

    if (levelStr === 'viral') return 'viral';
    if (levelStr === 'high') return 'high';
    if (levelStr === 'low') return 'low';

    return 'medium';
  }

  /**
   * Normalize area to valid improvement area
   * @private
   */
  private normalizeArea(
    area: any
  ): 'hook' | 'clarity' | 'emotion' | 'cta' | 'hashtags' | 'length' | 'format' {
    const areaStr = String(area || 'clarity').toLowerCase();

    const validAreas = ['hook', 'clarity', 'emotion', 'cta', 'hashtags', 'length', 'format'];

    if (validAreas.includes(areaStr)) {
      return areaStr as any;
    }

    // Map common variations
    if (areaStr.includes('call') || areaStr.includes('action')) return 'cta';
    if (areaStr.includes('hashtag')) return 'hashtags';
    if (areaStr.includes('opening') || areaStr.includes('start')) return 'hook';

    return 'clarity';
  }
}
