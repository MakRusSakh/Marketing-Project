import { Publisher, PublishOptions, PublishResult, AccountInfo } from './types';

/**
 * Twitter API Credentials
 */
export interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

/**
 * Twitter-specific publish options
 */
export interface TwitterPublishOptions extends PublishOptions {
  replyToId?: string;
  threadPosts?: string[];
}

/**
 * Twitter Publisher - Handles publishing to Twitter/X platform
 *
 * This implementation provides a structured mock that can be integrated
 * with the twitter-api-v2 package when API credentials are available.
 */
export class TwitterPublisher implements Publisher {
  private credentials: TwitterCredentials;
  private client: any; // Would be TwitterApi from twitter-api-v2
  private isInitialized: boolean = false;

  constructor(credentials: TwitterCredentials) {
    this.validateCredentialsFormat(credentials);
    this.credentials = credentials;
    this.initializeClient();
  }

  /**
   * Initialize the Twitter API client
   * In production, this would use: new TwitterApi({ ... })
   */
  private initializeClient(): void {
    try {
      // Mock client initialization
      // In production: this.client = new TwitterApi({
      //   appKey: this.credentials.apiKey,
      //   appSecret: this.credentials.apiSecret,
      //   accessToken: this.credentials.accessToken,
      //   accessSecret: this.credentials.accessSecret,
      // });

      this.client = {
        v2: {
          me: async () => ({
            data: {
              id: 'mock_user_id',
              username: 'mock_user',
              name: 'Mock User',
              public_metrics: {
                followers_count: 1000
              }
            }
          }),
          tweet: async (text: string, options?: any) => ({
            data: {
              id: `tweet_${Date.now()}`,
              text
            }
          }),
          reply: async (text: string, replyToId: string) => ({
            data: {
              id: `tweet_${Date.now()}`,
              text
            }
          }),
          deleteTweet: async (id: string) => ({
            data: { deleted: true }
          }),
          user: async (id: string) => ({
            data: {
              id,
              username: 'mock_user',
              name: 'Mock User',
              public_metrics: {
                followers_count: 1000
              }
            }
          })
        },
        v1: {
          uploadMedia: async (mediaData: any) => 'mock_media_id'
        }
      };

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Twitter client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate credentials format before use
   */
  private validateCredentialsFormat(credentials: TwitterCredentials): void {
    const required = ['apiKey', 'apiSecret', 'accessToken', 'accessSecret'];
    const missing = required.filter(key => !credentials[key as keyof TwitterCredentials]);

    if (missing.length > 0) {
      throw new Error(`Missing required Twitter credentials: ${missing.join(', ')}`);
    }
  }

  /**
   * Publish content to Twitter
   * Supports single tweets, threads, replies, and media
   */
  async publish(content: string, options?: TwitterPublishOptions): Promise<PublishResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Twitter client not initialized');
      }

      // Validate content
      this.validateContent(content, options);

      // Handle thread posting
      if (options?.threadPosts && options.threadPosts.length > 0) {
        return await this.publishThread(content, options);
      }

      // Handle reply
      if (options?.replyToId) {
        return await this.publishReply(content, options);
      }

      // Standard tweet
      return await this.publishTweet(content, options);

    } catch (error) {
      return this.handlePublishError(error);
    }
  }

  /**
   * Publish a single tweet
   */
  private async publishTweet(content: string, options?: PublishOptions): Promise<PublishResult> {
    try {
      const tweetData: any = { text: content };

      // Add media if provided
      if (options?.mediaUrls && options.mediaUrls.length > 0) {
        // In production, media would be uploaded first
        const mediaIds = await this.uploadMedia(options.mediaUrls);
        tweetData.media = { media_ids: mediaIds };
      }

      const response = await this.client.v2.tweet(tweetData.text, tweetData);
      const tweetId = response.data.id;

      return {
        success: true,
        postId: tweetId,
        postUrl: `https://twitter.com/i/web/status/${tweetId}`,
        publishedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to publish tweet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish a thread of tweets
   */
  private async publishThread(content: string, options: TwitterPublishOptions): Promise<PublishResult> {
    try {
      const posts = [content, ...(options.threadPosts || [])];
      const threadIds: string[] = [];
      let previousTweetId: string | undefined;

      for (let i = 0; i < posts.length; i++) {
        const postContent = posts[i];

        let response;
        if (previousTweetId) {
          // Reply to previous tweet in thread
          response = await this.client.v2.reply(postContent, previousTweetId);
        } else {
          // First tweet in thread - may include media
          const tweetData: any = { text: postContent };
          if (i === 0 && options.mediaUrls && options.mediaUrls.length > 0) {
            const mediaIds = await this.uploadMedia(options.mediaUrls);
            tweetData.media = { media_ids: mediaIds };
          }
          response = await this.client.v2.tweet(tweetData.text, tweetData);
        }

        const tweetId = response.data.id;
        threadIds.push(tweetId);
        previousTweetId = tweetId;

        // Rate limiting delay between thread posts
        if (i < posts.length - 1) {
          await this.sleep(1000);
        }
      }

      return {
        success: true,
        postId: threadIds[0],
        postUrl: `https://twitter.com/i/web/status/${threadIds[0]}`,
        publishedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to publish thread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish a reply to an existing tweet
   */
  private async publishReply(content: string, options: TwitterPublishOptions): Promise<PublishResult> {
    try {
      if (!options.replyToId) {
        throw new Error('Reply ID is required for reply tweets');
      }

      const response = await this.client.v2.reply(content, options.replyToId);
      const tweetId = response.data.id;

      return {
        success: true,
        postId: tweetId,
        postUrl: `https://twitter.com/i/web/status/${tweetId}`,
        publishedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to publish reply: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate credentials by attempting to fetch user info
   */
  async validateCredentials(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      const user = await this.client.v2.me();
      return !!user.data.id;
    } catch (error) {
      console.error('Twitter credential validation failed:', error);
      return false;
    }
  }

  /**
   * Get authenticated user's account information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      if (!this.isInitialized) {
        throw new Error('Twitter client not initialized');
      }

      const userResponse = await this.client.v2.me();
      const user = userResponse.data;

      return {
        id: user.id,
        name: user.name || user.username,
        username: user.username,
        followers: user.public_metrics?.followers_count || 0,
        avatarUrl: undefined, // Would be available in expanded user object
        isVerified: false, // Would check user.verified field
        additionalData: {
          tweetsCount: user.public_metrics?.tweet_count || 0,
          followingCount: user.public_metrics?.following_count || 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a tweet by ID
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      if (!postId || typeof postId !== 'string') {
        throw new Error('Invalid post ID');
      }

      const response = await this.client.v2.deleteTweet(postId);
      return response.data.deleted === true;
    } catch (error) {
      console.error(`Failed to delete tweet ${postId}:`, error);
      return false;
    }
  }

  /**
   * Validate content before publishing
   */
  private validateContent(content: string, options?: TwitterPublishOptions): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Tweet content cannot be empty');
    }

    // Twitter character limit (280 for most accounts)
    const maxLength = 280;
    if (content.length > maxLength) {
      throw new Error(`Tweet content exceeds ${maxLength} characters (${content.length})`);
    }

    // Validate thread posts if present
    if (options?.threadPosts) {
      options.threadPosts.forEach((post, index) => {
        if (!post || post.trim().length === 0) {
          throw new Error(`Thread post ${index + 2} cannot be empty`);
        }
        if (post.length > maxLength) {
          throw new Error(`Thread post ${index + 2} exceeds ${maxLength} characters (${post.length})`);
        }
      });
    }

    // Validate media URLs if present
    if (options?.mediaUrls && options.mediaUrls.length > 4) {
      throw new Error('Twitter supports a maximum of 4 media items per tweet');
    }
  }

  /**
   * Handle publish errors with proper error formatting
   */
  private handlePublishError(error: unknown): PublishResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      success: false,
      error: errorMessage
    };
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Upload media files to Twitter
   * In production, this would download and upload actual media
   */
  private async uploadMedia(mediaUrls: string[]): Promise<string[]> {
    // In production, this would:
    // 1. Download media from URLs or read from local paths
    // 2. Upload to Twitter using client.v1.uploadMedia()
    // 3. Return media IDs
    //
    // Example production code:
    // const mediaIds: string[] = [];
    // for (const url of mediaUrls) {
    //   const mediaBuffer = await downloadMedia(url);
    //   const mediaId = await this.client.v1.uploadMedia(mediaBuffer);
    //   mediaIds.push(mediaId);
    // }
    // return mediaIds;

    // Mock implementation
    return mediaUrls.map((_, index) => `mock_media_${Date.now()}_${index}`);
  }
}
