import { Publisher, PublishOptions, PublishResult, AccountInfo } from './types';

/**
 * Facebook API Credentials
 */
export interface FacebookCredentials {
  accessToken: string;
  pageId: string;
}

/**
 * Facebook-specific publish options
 */
export interface FacebookPublishOptions extends PublishOptions {
  mediaUrls?: string[];
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  scheduledPublishTime?: number; // Unix timestamp
  published?: boolean; // false for drafts
}

/**
 * Facebook Post Response
 */
interface FacebookPostResponse {
  id: string;
  post_id?: string;
}

/**
 * Facebook Page Info Response
 */
interface FacebookPageInfo {
  id: string;
  name: string;
  username?: string;
  followers_count?: number;
  picture?: {
    data: {
      url: string;
    };
  };
  verification_status?: string;
  about?: string;
  category?: string;
}

/**
 * Facebook Publisher - Handles publishing to Facebook Pages
 *
 * This implementation provides a structured mock that can be integrated
 * with the Facebook Graph API when API credentials are available.
 */
export class FacebookPublisher implements Publisher {
  private credentials: FacebookCredentials;
  private apiVersion: string = 'v18.0';
  private baseUrl: string;
  private isInitialized: boolean = false;

  constructor(credentials: FacebookCredentials) {
    this.validateCredentialsFormat(credentials);
    this.credentials = credentials;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.initializeClient();
  }

  /**
   * Initialize the Facebook API client
   */
  private initializeClient(): void {
    try {
      // Validate that we have the required credentials
      if (!this.credentials.accessToken || !this.credentials.pageId) {
        throw new Error('Missing required Facebook credentials');
      }

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Facebook client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate credentials format before use
   */
  private validateCredentialsFormat(credentials: FacebookCredentials): void {
    const required: (keyof FacebookCredentials)[] = ['accessToken', 'pageId'];
    const missing = required.filter(key => !credentials[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required Facebook credentials: ${missing.join(', ')}`);
    }

    if (!credentials.accessToken.trim()) {
      throw new Error('Facebook access token cannot be empty');
    }

    if (!credentials.pageId.trim()) {
      throw new Error('Facebook page ID cannot be empty');
    }
  }

  /**
   * Publish content to Facebook Page
   * Supports text posts, photos, videos, links, and scheduled publishing
   */
  async publish(content: string, options?: FacebookPublishOptions): Promise<PublishResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Facebook client not initialized');
      }

      // Validate content
      this.validateContent(content, options);

      // Determine post type and route to appropriate method
      if (options?.mediaUrls && options.mediaUrls.length > 0) {
        return await this.publishMediaPost(content, options);
      } else if (options?.linkUrl) {
        return await this.publishLinkPost(content, options);
      } else {
        return await this.publishTextPost(content, options);
      }

    } catch (error) {
      return this.handlePublishError(error);
    }
  }

  /**
   * Publish a text-only post
   */
  private async publishTextPost(content: string, options?: FacebookPublishOptions): Promise<PublishResult> {
    try {
      const endpoint = `${this.baseUrl}/${this.credentials.pageId}/feed`;

      const params: Record<string, any> = {
        message: content,
        access_token: this.credentials.accessToken
      };

      // Add scheduling if specified
      if (options?.scheduledPublishTime) {
        params.published = false;
        params.scheduled_publish_time = options.scheduledPublishTime;
      }

      // Handle draft mode
      if (options?.published === false) {
        params.published = false;
      }

      // Mock API call - In production, use fetch or axios
      const response = await this.mockGraphApiCall(endpoint, 'POST', params);
      const postId = response.id || response.post_id || `${this.credentials.pageId}_${Date.now()}`;

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId}`,
        publishedAt: options?.scheduledPublishTime
          ? new Date(options.scheduledPublishTime * 1000)
          : new Date()
      };
    } catch (error) {
      throw new Error(`Failed to publish text post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish a post with media (photos or videos)
   */
  private async publishMediaPost(content: string, options: FacebookPublishOptions): Promise<PublishResult> {
    try {
      if (!options.mediaUrls || options.mediaUrls.length === 0) {
        throw new Error('Media URLs are required for media posts');
      }

      const mediaUrl = options.mediaUrls[0];
      const isVideo = this.isVideoUrl(mediaUrl);

      // Determine if this is a single or multiple photo post
      if (!isVideo && options.mediaUrls.length > 1) {
        return await this.publishMultiplePhotos(content, options);
      }

      // Single media post
      const endpoint = isVideo
        ? `${this.baseUrl}/${this.credentials.pageId}/videos`
        : `${this.baseUrl}/${this.credentials.pageId}/photos`;

      const params: Record<string, any> = {
        access_token: this.credentials.accessToken
      };

      if (isVideo) {
        params.file_url = mediaUrl;
        params.description = content;
      } else {
        params.url = mediaUrl;
        params.caption = content;
      }

      // Add scheduling if specified
      if (options.scheduledPublishTime) {
        params.published = false;
        params.scheduled_publish_time = options.scheduledPublishTime;
      }

      // Handle draft mode
      if (options.published === false) {
        params.published = false;
      }

      const response = await this.mockGraphApiCall(endpoint, 'POST', params);
      const postId = response.id || response.post_id || `${this.credentials.pageId}_${Date.now()}`;

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId}`,
        publishedAt: options.scheduledPublishTime
          ? new Date(options.scheduledPublishTime * 1000)
          : new Date()
      };
    } catch (error) {
      throw new Error(`Failed to publish media post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish multiple photos as an album/carousel
   */
  private async publishMultiplePhotos(content: string, options: FacebookPublishOptions): Promise<PublishResult> {
    try {
      if (!options.mediaUrls || options.mediaUrls.length < 2) {
        throw new Error('At least 2 photos required for multiple photo post');
      }

      // Step 1: Upload photos and get their IDs (unpublished)
      const photoIds: string[] = [];

      for (const photoUrl of options.mediaUrls) {
        if (this.isVideoUrl(photoUrl)) {
          throw new Error('Cannot mix videos with photos in multiple photo post');
        }

        const uploadEndpoint = `${this.baseUrl}/${this.credentials.pageId}/photos`;
        const uploadParams = {
          url: photoUrl,
          published: false,
          access_token: this.credentials.accessToken
        };

        const uploadResponse = await this.mockGraphApiCall(uploadEndpoint, 'POST', uploadParams);
        photoIds.push(uploadResponse.id);
      }

      // Step 2: Create the album/carousel post
      const feedEndpoint = `${this.baseUrl}/${this.credentials.pageId}/feed`;
      const feedParams: Record<string, any> = {
        message: content,
        attached_media: photoIds.map(id => ({ media_fbid: id })),
        access_token: this.credentials.accessToken
      };

      // Add scheduling if specified
      if (options.scheduledPublishTime) {
        feedParams.published = false;
        feedParams.scheduled_publish_time = options.scheduledPublishTime;
      }

      // Handle draft mode
      if (options.published === false) {
        feedParams.published = false;
      }

      const response = await this.mockGraphApiCall(feedEndpoint, 'POST', feedParams);
      const postId = response.id || response.post_id || `${this.credentials.pageId}_${Date.now()}`;

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId}`,
        publishedAt: options.scheduledPublishTime
          ? new Date(options.scheduledPublishTime * 1000)
          : new Date()
      };
    } catch (error) {
      throw new Error(`Failed to publish multiple photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish a link post with preview
   */
  private async publishLinkPost(content: string, options: FacebookPublishOptions): Promise<PublishResult> {
    try {
      if (!options.linkUrl) {
        throw new Error('Link URL is required for link posts');
      }

      const endpoint = `${this.baseUrl}/${this.credentials.pageId}/feed`;

      const params: Record<string, any> = {
        message: content,
        link: options.linkUrl,
        access_token: this.credentials.accessToken
      };

      // Add optional link metadata
      if (options.linkTitle) {
        params.name = options.linkTitle;
      }

      if (options.linkDescription) {
        params.description = options.linkDescription;
      }

      // Add media preview if provided
      if (options.mediaUrls && options.mediaUrls.length > 0) {
        params.picture = options.mediaUrls[0];
      }

      // Add scheduling if specified
      if (options.scheduledPublishTime) {
        params.published = false;
        params.scheduled_publish_time = options.scheduledPublishTime;
      }

      // Handle draft mode
      if (options.published === false) {
        params.published = false;
      }

      const response = await this.mockGraphApiCall(endpoint, 'POST', params);
      const postId = response.id || response.post_id || `${this.credentials.pageId}_${Date.now()}`;

      return {
        success: true,
        postId: postId,
        postUrl: `https://www.facebook.com/${postId}`,
        publishedAt: options.scheduledPublishTime
          ? new Date(options.scheduledPublishTime * 1000)
          : new Date()
      };
    } catch (error) {
      throw new Error(`Failed to publish link post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate credentials by attempting to fetch page info
   */
  async validateCredentials(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      const endpoint = `${this.baseUrl}/${this.credentials.pageId}`;
      const params = {
        fields: 'id,name',
        access_token: this.credentials.accessToken
      };

      const response = await this.mockGraphApiCall(endpoint, 'GET', params);
      return !!response.id;
    } catch (error) {
      console.error('Facebook credential validation failed:', error);
      return false;
    }
  }

  /**
   * Get Facebook Page information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      if (!this.isInitialized) {
        throw new Error('Facebook client not initialized');
      }

      const endpoint = `${this.baseUrl}/${this.credentials.pageId}`;
      const params = {
        fields: 'id,name,username,followers_count,picture,verification_status,about,category',
        access_token: this.credentials.accessToken
      };

      const pageInfo: FacebookPageInfo = await this.mockGraphApiCall(endpoint, 'GET', params);

      return {
        id: pageInfo.id,
        name: pageInfo.name,
        username: pageInfo.username,
        followers: pageInfo.followers_count || 0,
        avatarUrl: pageInfo.picture?.data?.url,
        isVerified: pageInfo.verification_status === 'blue_verified' ||
                    pageInfo.verification_status === 'gray_verified',
        additionalData: {
          about: pageInfo.about,
          category: pageInfo.category
        }
      };
    } catch (error) {
      throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a post from Facebook Page
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      if (!postId || typeof postId !== 'string') {
        throw new Error('Invalid post ID');
      }

      const endpoint = `${this.baseUrl}/${postId}`;
      const params = {
        access_token: this.credentials.accessToken
      };

      const response = await this.mockGraphApiCall(endpoint, 'DELETE', params);
      return response.success === true;
    } catch (error) {
      console.error(`Failed to delete post ${postId}:`, error);
      return false;
    }
  }

  /**
   * Validate content before publishing
   */
  private validateContent(content: string, options?: FacebookPublishOptions): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Post content cannot be empty');
    }

    // Facebook post character limit (63,206 characters)
    const maxLength = 63206;
    if (content.length > maxLength) {
      throw new Error(`Post content exceeds ${maxLength} characters (${content.length})`);
    }

    // Validate media URLs if present
    if (options?.mediaUrls && options.mediaUrls.length > 0) {
      // Facebook supports up to 10 images in a single post
      if (options.mediaUrls.length > 10) {
        throw new Error('Facebook supports a maximum of 10 media items per post');
      }

      // Validate each URL
      options.mediaUrls.forEach((url, index) => {
        if (!this.isValidUrl(url)) {
          throw new Error(`Invalid media URL at index ${index}: ${url}`);
        }
      });
    }

    // Validate link URL if present
    if (options?.linkUrl && !this.isValidUrl(options.linkUrl)) {
      throw new Error(`Invalid link URL: ${options.linkUrl}`);
    }

    // Validate scheduled publish time
    if (options?.scheduledPublishTime) {
      const now = Math.floor(Date.now() / 1000);
      const minScheduleTime = now + 600; // Minimum 10 minutes in the future
      const maxScheduleTime = now + (365 * 24 * 60 * 60); // Maximum 1 year in the future

      if (options.scheduledPublishTime < minScheduleTime) {
        throw new Error('Scheduled publish time must be at least 10 minutes in the future');
      }

      if (options.scheduledPublishTime > maxScheduleTime) {
        throw new Error('Scheduled publish time cannot be more than 1 year in the future');
      }
    }
  }

  /**
   * Check if a URL is a video URL based on extension
   */
  private isVideoUrl(url: string): boolean {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm', '.m4v'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext));
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
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
   * Mock Graph API call
   * In production, this would use fetch or axios to make real API calls
   */
  private async mockGraphApiCall(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE',
    params: Record<string, any>
  ): Promise<any> {
    // In production, this would be:
    // const url = method === 'GET'
    //   ? `${endpoint}?${new URLSearchParams(params).toString()}`
    //   : endpoint;
    //
    // const response = await fetch(url, {
    //   method,
    //   headers: method !== 'GET' ? {
    //     'Content-Type': 'application/json'
    //   } : undefined,
    //   body: method !== 'GET' ? JSON.stringify(params) : undefined
    // });
    //
    // if (!response.ok) {
    //   const error = await response.json();
    //   throw new Error(error.error?.message || 'Facebook API error');
    // }
    //
    // return await response.json();

    // Mock implementation for testing/development
    await this.sleep(100); // Simulate network delay

    if (method === 'DELETE') {
      return { success: true };
    }

    if (method === 'GET' && endpoint.includes(`/${this.credentials.pageId}`)) {
      // Mock page info response
      return {
        id: this.credentials.pageId,
        name: 'Mock Page Name',
        username: 'mockpage',
        followers_count: 5000,
        picture: {
          data: {
            url: 'https://example.com/page-avatar.jpg'
          }
        },
        verification_status: 'blue_verified',
        about: 'This is a mock Facebook page',
        category: 'Business'
      };
    }

    // Mock post creation response
    const postId = `${this.credentials.pageId}_${Date.now()}`;
    return {
      id: postId,
      post_id: postId
    };
  }

  /**
   * Sleep utility for simulating delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
