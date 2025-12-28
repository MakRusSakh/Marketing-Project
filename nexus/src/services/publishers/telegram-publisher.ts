import { Publisher, PublishOptions, PublishResult, AccountInfo } from './types';

/**
 * Telegram Bot Credentials
 */
export interface TelegramCredentials {
  botToken: string;
  channelId: string; // Can be @channelname or numeric ID
}

/**
 * Telegram message formatting modes
 */
export type TelegramParseMode = 'Markdown' | 'MarkdownV2' | 'HTML';

/**
 * Telegram-specific publish options
 */
export interface TelegramPublishOptions extends PublishOptions {
  parseMode?: TelegramParseMode;
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
  threadId?: number; // For forum/topic channels
}

/**
 * Telegram Publisher - Handles publishing to Telegram channels
 *
 * This implementation provides a structured mock that can be integrated
 * with the node-telegram-bot-api package when bot credentials are available.
 */
export class TelegramPublisher implements Publisher {
  private credentials: TelegramCredentials;
  private bot: any; // Would be TelegramBot from node-telegram-bot-api
  private isInitialized: boolean = false;

  constructor(credentials: TelegramCredentials) {
    this.validateCredentialsFormat(credentials);
    this.credentials = credentials;
    this.initializeBot();
  }

  /**
   * Initialize the Telegram Bot API client
   * In production, this would use: new TelegramBot(token, { polling: false })
   */
  private initializeBot(): void {
    try {
      // Mock bot initialization
      // In production: this.bot = new TelegramBot(this.credentials.botToken, {
      //   polling: false,
      //   filepath: false
      // });

      this.bot = {
        sendMessage: async (chatId: string, text: string, options?: any) => ({
          message_id: Math.floor(Math.random() * 1000000),
          chat: {
            id: chatId,
            title: 'Mock Channel',
            type: 'channel'
          },
          date: Math.floor(Date.now() / 1000),
          text
        }),
        sendPhoto: async (chatId: string, photo: string, options?: any) => ({
          message_id: Math.floor(Math.random() * 1000000),
          chat: {
            id: chatId,
            title: 'Mock Channel',
            type: 'channel'
          },
          date: Math.floor(Date.now() / 1000),
          photo: [{ file_id: 'mock_file_id' }],
          caption: options?.caption
        }),
        sendMediaGroup: async (chatId: string, media: any[], options?: any) => ([
          {
            message_id: Math.floor(Math.random() * 1000000),
            chat: {
              id: chatId,
              title: 'Mock Channel',
              type: 'channel'
            },
            date: Math.floor(Date.now() / 1000)
          }
        ]),
        deleteMessage: async (chatId: string, messageId: string) => true,
        getChat: async (chatId: string) => ({
          id: chatId,
          title: 'Mock Channel',
          type: 'channel',
          username: 'mockchannel',
          description: 'Mock channel for testing',
          members_count: undefined // Not available for channels
        }),
        getMe: async () => ({
          id: 123456789,
          is_bot: true,
          first_name: 'Mock Bot',
          username: 'mock_bot'
        }),
        getChatMemberCount: async (chatId: string) => 1000
      };

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Telegram bot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate credentials format before use
   */
  private validateCredentialsFormat(credentials: TelegramCredentials): void {
    if (!credentials.botToken || typeof credentials.botToken !== 'string') {
      throw new Error('Bot token is required and must be a string');
    }

    if (!credentials.channelId || (typeof credentials.channelId !== 'string' && typeof credentials.channelId !== 'number')) {
      throw new Error('Channel ID is required and must be a string or number');
    }

    // Basic bot token format validation (should be in format: 123456789:ABC-DEF...)
    if (!credentials.botToken.includes(':')) {
      throw new Error('Invalid bot token format. Token should be in format: 123456789:ABC-DEF...');
    }
  }

  /**
   * Publish content to Telegram channel
   * Supports text messages, formatted messages, and media
   */
  async publish(content: string, options?: TelegramPublishOptions): Promise<PublishResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Telegram bot not initialized');
      }

      // Validate content
      this.validateContent(content);

      // Handle media publishing
      if (options?.mediaUrls && options.mediaUrls.length > 0) {
        return await this.publishWithMedia(content, options);
      }

      // Standard text message
      return await this.publishMessage(content, options);

    } catch (error) {
      return this.handlePublishError(error);
    }
  }

  /**
   * Publish a text message to the channel
   */
  private async publishMessage(content: string, options?: TelegramPublishOptions): Promise<PublishResult> {
    try {
      const messageOptions: any = {};

      // Set parse mode for formatted messages
      if (options?.parseMode) {
        messageOptions.parse_mode = options.parseMode;
      }

      // Disable web page preview if requested
      if (options?.disableWebPagePreview) {
        messageOptions.disable_web_page_preview = true;
      }

      // Disable notification if requested (silent message)
      if (options?.disableNotification) {
        messageOptions.disable_notification = true;
      }

      // Reply to specific message
      if (options?.replyToMessageId) {
        messageOptions.reply_to_message_id = options.replyToMessageId;
      }

      // Send to specific thread/topic in forum
      if (options?.threadId) {
        messageOptions.message_thread_id = options.threadId;
      }

      const message = await this.bot.sendMessage(
        this.credentials.channelId,
        content,
        messageOptions
      );

      const messageId = message.message_id.toString();
      const postUrl = this.buildMessageUrl(messageId);

      return {
        success: true,
        postId: messageId,
        postUrl,
        publishedAt: new Date(message.date * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to publish Telegram message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish message with media attachments
   */
  private async publishWithMedia(content: string, options: TelegramPublishOptions): Promise<PublishResult> {
    try {
      const mediaUrls = options.mediaUrls || [];

      if (mediaUrls.length === 1) {
        // Single media - use sendPhoto with caption
        return await this.publishSingleMedia(content, mediaUrls[0], options);
      } else {
        // Multiple media - use sendMediaGroup
        return await this.publishMediaGroup(content, mediaUrls, options);
      }
    } catch (error) {
      throw new Error(`Failed to publish Telegram media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish a single media item with caption
   */
  private async publishSingleMedia(
    content: string,
    mediaUrl: string,
    options: TelegramPublishOptions
  ): Promise<PublishResult> {
    try {
      const photoOptions: any = {
        caption: content
      };

      if (options.parseMode) {
        photoOptions.parse_mode = options.parseMode;
      }

      if (options.disableNotification) {
        photoOptions.disable_notification = true;
      }

      if (options.replyToMessageId) {
        photoOptions.reply_to_message_id = options.replyToMessageId;
      }

      if (options.threadId) {
        photoOptions.message_thread_id = options.threadId;
      }

      const message = await this.bot.sendPhoto(
        this.credentials.channelId,
        mediaUrl,
        photoOptions
      );

      const messageId = message.message_id.toString();
      const postUrl = this.buildMessageUrl(messageId);

      return {
        success: true,
        postId: messageId,
        postUrl,
        publishedAt: new Date(message.date * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to publish single media: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Publish multiple media items as a group
   */
  private async publishMediaGroup(
    content: string,
    mediaUrls: string[],
    options: TelegramPublishOptions
  ): Promise<PublishResult> {
    try {
      // Build media array for sendMediaGroup
      const media = mediaUrls.map((url, index) => ({
        type: 'photo', // Could be enhanced to detect type from URL
        media: url,
        caption: index === 0 ? content : undefined, // Caption on first media only
        parse_mode: index === 0 && options.parseMode ? options.parseMode : undefined
      }));

      const groupOptions: any = {};

      if (options.disableNotification) {
        groupOptions.disable_notification = true;
      }

      if (options.replyToMessageId) {
        groupOptions.reply_to_message_id = options.replyToMessageId;
      }

      if (options.threadId) {
        groupOptions.message_thread_id = options.threadId;
      }

      const messages = await this.bot.sendMediaGroup(
        this.credentials.channelId,
        media,
        groupOptions
      );

      // Use first message ID as the post ID
      const firstMessage = messages[0];
      const messageId = firstMessage.message_id.toString();
      const postUrl = this.buildMessageUrl(messageId);

      return {
        success: true,
        postId: messageId,
        postUrl,
        publishedAt: new Date(firstMessage.date * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to publish media group: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate credentials by checking bot info and channel access
   */
  async validateCredentials(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      // Verify bot token by getting bot info
      const botInfo = await this.bot.getMe();
      if (!botInfo || !botInfo.is_bot) {
        return false;
      }

      // Verify channel access by getting chat info
      const chat = await this.bot.getChat(this.credentials.channelId);
      if (!chat) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Telegram credential validation failed:', error);
      return false;
    }
  }

  /**
   * Get channel information
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      if (!this.isInitialized) {
        throw new Error('Telegram bot not initialized');
      }

      const chat = await this.bot.getChat(this.credentials.channelId);

      // Get member count if available (works for supergroups, not for channels)
      let membersCount: number | undefined;
      try {
        membersCount = await this.bot.getChatMemberCount(this.credentials.channelId);
      } catch {
        // Member count not available for channels
        membersCount = undefined;
      }

      return {
        id: chat.id.toString(),
        name: chat.title || 'Unknown Channel',
        username: chat.username ? `@${chat.username}` : undefined,
        followers: membersCount,
        avatarUrl: undefined, // Would require getChat with photo info
        isVerified: false, // Telegram doesn't have verification badges like Twitter
        additionalData: {
          type: chat.type,
          description: chat.description,
          inviteLink: undefined // Would be available if bot is admin
        }
      };
    } catch (error) {
      throw new Error(`Failed to get channel info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a message from the channel
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        return false;
      }

      if (!postId || typeof postId !== 'string') {
        throw new Error('Invalid post ID');
      }

      const result = await this.bot.deleteMessage(
        this.credentials.channelId,
        postId
      );

      return result === true;
    } catch (error) {
      console.error(`Failed to delete Telegram message ${postId}:`, error);
      return false;
    }
  }

  /**
   * Validate content before publishing
   */
  private validateContent(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    // Telegram message length limit
    const maxLength = 4096;
    if (content.length > maxLength) {
      throw new Error(`Message content exceeds ${maxLength} characters (${content.length})`);
    }
  }

  /**
   * Build message URL for public channels
   * Format: https://t.me/channelname/messageId
   */
  private buildMessageUrl(messageId: string): string | undefined {
    const channelId = this.credentials.channelId;

    // If channel ID is a username (starts with @), we can build a public URL
    if (typeof channelId === 'string' && channelId.startsWith('@')) {
      const channelName = channelId.substring(1); // Remove @
      return `https://t.me/${channelName}/${messageId}`;
    }

    // For numeric channel IDs, we can't build a public URL without knowing the username
    // Return undefined as the URL is not publicly accessible
    return undefined;
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
   * Format text with Markdown
   * Helper method for content creators
   */
  static formatMarkdown(text: string): string {
    // Telegram supports basic Markdown formatting
    // *bold* _italic_ [link](url) `code` ```code block```
    return text;
  }

  /**
   * Format text with HTML
   * Helper method for content creators
   */
  static formatHTML(text: string): string {
    // Telegram supports HTML formatting
    // <b>bold</b> <i>italic</i> <a href="url">link</a> <code>code</code> <pre>code block</pre>
    return text;
  }

  /**
   * Escape special characters for MarkdownV2
   * MarkdownV2 requires escaping: _ * [ ] ( ) ~ ` > # + - = | { } . !
   */
  static escapeMarkdownV2(text: string): string {
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    let escapedText = text;

    for (const char of specialChars) {
      escapedText = escapedText.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
    }

    return escapedText;
  }

  /**
   * Escape HTML special characters
   */
  static escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
