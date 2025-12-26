/**
 * Publisher Service Types
 * Defines interfaces for social media publishers and publishing queue
 */

export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  publishedAt?: Date;
}

export interface AccountInfo {
  id: string;
  name: string;
  username?: string;
  followers?: number;
  avatarUrl?: string;
  isVerified?: boolean;
  additionalData?: Record<string, unknown>;
}

export interface PublisherCredentials {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Base Publisher Interface
 * All platform-specific publishers must implement this interface
 */
export interface Publisher {
  /**
   * Publish content to the platform
   * @param content - The text content to publish
   * @param options - Platform-specific options (embeds, attachments, etc.)
   */
  publish(content: string, options?: PublishOptions): Promise<PublishResult>;

  /**
   * Validate that the provided credentials are valid and have necessary permissions
   */
  validateCredentials(): Promise<boolean>;

  /**
   * Get information about the connected account
   */
  getAccountInfo(): Promise<AccountInfo>;

  /**
   * Delete a published post
   * @param postId - The ID of the post to delete
   */
  deletePost(postId: string): Promise<boolean>;
}

export interface PublishOptions {
  mediaUrls?: string[];
  title?: string;
  description?: string;
  embedData?: EmbedData;
  attachmentUrls?: string[];
  metadata?: Record<string, unknown>;
}

export interface EmbedData {
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  footer?: string;
  timestamp?: Date;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

// Publishing Queue Types

export interface PublishJob {
  contentId: string;
  channelId: string;
  content: string;
  mediaUrls?: string[];
  priority?: number;
}

export interface QueuedJob {
  id: string;
  job: PublishJob;
  status: 'waiting' | 'active' | 'delayed' | 'completed' | 'failed';
  scheduledFor?: Date;
  createdAt: Date;
}

export interface JobStatus {
  id: string;
  state: string;
  progress: number;
  result?: PublishResult;
  error?: string;
  attempts: number;
  maxAttempts: number;
}

export interface QueueConfig {
  redisUrl?: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
  };
}
