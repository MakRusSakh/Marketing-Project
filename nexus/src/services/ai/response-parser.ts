/**
 * Response Parser for AI-generated content
 * Handles parsing, validation, and extraction of content elements
 */

export type Platform =
  | "twitter"
  | "linkedin"
  | "telegram"
  | "discord"
  | "vk"
  | "instagram";

// Platform character limits
export const PLATFORM_LIMITS: Record<Platform, number> = {
  twitter: 280,
  linkedin: 3000,
  telegram: 4096,
  discord: 2000,
  vk: 16384,
  instagram: 2200,
};

export interface ParsedContent {
  mainContent: string;
  hashtags: string[];
  mentions: string[];
  mediaHints: string[];
  callToAction?: string;
}

export interface ParsedThread {
  posts: string[];
  totalLength: number;
  estimatedReadTime: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  characterCount: number;
  limit: number;
}

/**
 * ResponseParser class for parsing and validating AI-generated content
 */
export class ResponseParser {
  private readonly HASHTAG_REGEX = /#[\w\u0400-\u04FF]+/g;
  private readonly MENTION_REGEX = /@[\w\u0400-\u04FF]+/g;
  private readonly MEDIA_HINT_MARKERS = [
    "[IMAGE:",
    "[VIDEO:",
    "[PHOTO:",
    "[GIF:",
    "[MEDIA:",
  ];
  private readonly CTA_MARKERS = [
    "call to action:",
    "cta:",
    "action:",
    "learn more:",
    "visit:",
    "click here:",
    "sign up:",
    "register:",
    "download:",
    "get started:",
  ];
  private readonly THREAD_SEPARATORS = [
    /\n\n---\n\n/,
    /\n\n===\n\n/,
    /\[\d+\/\d+\]/,
    /Post \d+:/i,
    /Thread \d+:/i,
  ];
  private readonly AVERAGE_READING_SPEED = 200; // words per minute

  /**
   * Parse a single content response from AI
   * @param response Raw AI response string
   * @returns Parsed content with extracted elements
   */
  parseContentResponse(response: string): ParsedContent {
    if (!response || typeof response !== "string") {
      throw new Error("Invalid response: must be a non-empty string");
    }

    const trimmedResponse = response.trim();

    // Extract hashtags
    const hashtags = this.extractHashtags(trimmedResponse);

    // Extract mentions
    const mentions = this.extractMentions(trimmedResponse);

    // Extract media hints
    const mediaHints = this.extractMediaHints(trimmedResponse);

    // Extract call to action
    const callToAction = this.extractCallToAction(trimmedResponse);

    // Clean main content by removing extracted elements
    let mainContent = this.cleanMainContent(trimmedResponse, {
      mediaHints,
      callToAction,
    });

    return {
      mainContent,
      hashtags,
      mentions,
      mediaHints,
      callToAction,
    };
  }

  /**
   * Parse a multi-post thread response from AI
   * @param response Raw AI response containing multiple posts
   * @returns Parsed thread with individual posts and metadata
   */
  parseThreadResponse(response: string): ParsedThread {
    if (!response || typeof response !== "string") {
      throw new Error("Invalid response: must be a non-empty string");
    }

    const trimmedResponse = response.trim();

    // Try different separation strategies
    let posts = this.separatePosts(trimmedResponse);

    // If no separators found, try to split by double newlines
    if (posts.length === 1) {
      posts = trimmedResponse
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    }

    // Clean and validate posts
    posts = posts
      .map((post) => this.cleanPost(post))
      .filter((post) => post.length > 0);

    if (posts.length === 0) {
      throw new Error("No valid posts found in thread response");
    }

    const totalLength = posts.reduce((sum, post) => sum + post.length, 0);
    const estimatedReadTime = this.calculateReadTime(posts.join(" "));

    return {
      posts,
      totalLength,
      estimatedReadTime,
    };
  }

  /**
   * Extract hashtags from content
   * @param content Content string
   * @returns Array of hashtags (without # symbol)
   */
  extractHashtags(content: string): string[] {
    if (!content) return [];

    const matches = content.match(this.HASHTAG_REGEX);
    if (!matches) return [];

    // Remove duplicates and the # symbol, maintain order
    const seen = new Set<string>();
    return matches
      .map((tag) => tag.slice(1)) // Remove # symbol
      .filter((tag) => {
        if (seen.has(tag.toLowerCase())) {
          return false;
        }
        seen.add(tag.toLowerCase());
        return true;
      });
  }

  /**
   * Extract mentions from content
   * @param content Content string
   * @returns Array of mentions (without @ symbol)
   */
  extractMentions(content: string): string[] {
    if (!content) return [];

    const matches = content.match(this.MENTION_REGEX);
    if (!matches) return [];

    // Remove duplicates and the @ symbol, maintain order
    const seen = new Set<string>();
    return matches
      .map((mention) => mention.slice(1)) // Remove @ symbol
      .filter((mention) => {
        if (seen.has(mention.toLowerCase())) {
          return false;
        }
        seen.add(mention.toLowerCase());
        return true;
      });
  }

  /**
   * Validate content length against platform limits
   * @param content Content to validate
   * @param platform Target platform
   * @returns Validation result with issues if any
   */
  validateLength(content: string, platform: Platform): ValidationResult {
    if (!content || typeof content !== "string") {
      return {
        valid: false,
        issues: ["Content cannot be empty"],
        characterCount: 0,
        limit: PLATFORM_LIMITS[platform],
      };
    }

    const characterCount = content.length;
    const limit = PLATFORM_LIMITS[platform];
    const valid = characterCount <= limit;
    const issues: string[] = [];

    if (!valid) {
      const excess = characterCount - limit;
      issues.push(
        `Content exceeds ${platform} limit by ${excess} characters (${characterCount}/${limit})`
      );
    }

    // Additional platform-specific validations
    if (platform === "twitter") {
      // Check for tweets that are too short (might be flagged as spam)
      if (characterCount < 10) {
        issues.push("Tweet is too short (minimum recommended: 10 characters)");
      }
    }

    if (platform === "instagram") {
      // Instagram has a hashtag limit of 30
      const hashtags = this.extractHashtags(content);
      if (hashtags.length > 30) {
        issues.push(
          `Too many hashtags for Instagram (${hashtags.length}/30 max)`
        );
      }
    }

    return {
      valid: valid && issues.length === 0,
      issues,
      characterCount,
      limit,
    };
  }

  /**
   * Extract media hints from content
   * @private
   */
  private extractMediaHints(content: string): string[] {
    const hints: string[] = [];

    for (const marker of this.MEDIA_HINT_MARKERS) {
      const regex = new RegExp(
        `\\${marker}([^\\]]+)\\]`,
        "gi"
      );
      const matches = content.matchAll(regex);

      for (const match of matches) {
        if (match[1]) {
          hints.push(`${marker}${match[1].trim()}]`);
        }
      }
    }

    return hints;
  }

  /**
   * Extract call to action from content
   * @private
   */
  private extractCallToAction(content: string): string | undefined {
    const lines = content.split("\n");

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      for (const marker of this.CTA_MARKERS) {
        if (lowerLine.includes(marker)) {
          // Extract the CTA text after the marker
          const index = lowerLine.indexOf(marker);
          const ctaText = line.slice(index + marker.length).trim();

          if (ctaText) {
            return ctaText;
          }
        }
      }
    }

    // Look for common CTA patterns at the end of content
    const lastLine = lines[lines.length - 1]?.trim();
    if (lastLine && this.looksLikeCTA(lastLine)) {
      return lastLine;
    }

    return undefined;
  }

  /**
   * Check if a line looks like a CTA
   * @private
   */
  private looksLikeCTA(line: string): boolean {
    const ctaPatterns = [
      /^(visit|check out|learn more|sign up|register|download|get started)/i,
      /^(click|tap|swipe|follow|subscribe)/i,
      /(now|today|free|limited time)$/i,
      /\b(link in bio|link below|dm us|contact us)\b/i,
    ];

    return ctaPatterns.some((pattern) => pattern.test(line));
  }

  /**
   * Clean main content by removing extracted elements
   * @private
   */
  private cleanMainContent(
    content: string,
    extracted: { mediaHints: string[]; callToAction?: string }
  ): string {
    let cleaned = content;

    // Remove media hints
    for (const hint of extracted.mediaHints) {
      cleaned = cleaned.replace(hint, "");
    }

    // Remove CTA markers but keep the CTA text if it's part of content
    for (const marker of this.CTA_MARKERS) {
      const regex = new RegExp(`^${marker}\\s*`, "gim");
      cleaned = cleaned.replace(regex, "");
    }

    // Clean up extra whitespace
    cleaned = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n")
      .trim();

    return cleaned;
  }

  /**
   * Separate posts in a thread using various strategies
   * @private
   */
  private separatePosts(content: string): string[] {
    for (const separator of this.THREAD_SEPARATORS) {
      const posts = content.split(separator);

      if (posts.length > 1) {
        return posts.map((p) => p.trim()).filter((p) => p.length > 0);
      }
    }

    // If no separator worked, try to find numbered posts
    const numberedPosts = this.extractNumberedPosts(content);
    if (numberedPosts.length > 1) {
      return numberedPosts;
    }

    return [content];
  }

  /**
   * Extract numbered posts from content (e.g., "1/5", "2/5", etc.)
   * @private
   */
  private extractNumberedPosts(content: string): string[] {
    const lines = content.split("\n");
    const posts: string[] = [];
    let currentPost: string[] = [];

    for (const line of lines) {
      // Check if line starts with a post number indicator
      if (/^\d+[\/\-\.]\d+/.test(line.trim())) {
        if (currentPost.length > 0) {
          posts.push(currentPost.join("\n").trim());
          currentPost = [];
        }
      }
      currentPost.push(line);
    }

    if (currentPost.length > 0) {
      posts.push(currentPost.join("\n").trim());
    }

    return posts;
  }

  /**
   * Clean individual post content
   * @private
   */
  private cleanPost(post: string): string {
    // Remove post number indicators
    let cleaned = post.replace(/^\d+[\/\-\.]\d+\s*/, "").trim();
    cleaned = cleaned.replace(/^(Post|Thread)\s+\d+:\s*/i, "").trim();

    // Remove separator lines
    cleaned = cleaned.replace(/^[-=]+$/gm, "").trim();

    // Clean up whitespace
    cleaned = cleaned
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    return cleaned;
  }

  /**
   * Calculate estimated read time in minutes
   * @private
   */
  private calculateReadTime(content: string): number {
    const words = content.split(/\s+/).length;
    const minutes = words / this.AVERAGE_READING_SPEED;
    return Math.max(1, Math.ceil(minutes));
  }
}

// Export singleton instance
export const responseParser = new ResponseParser();
