/**
 * Automation Executor Service
 * Executes automation actions and logs results
 */

import { prisma } from '@/lib/prisma';
import {
  ClaudeClient,
  ContentGenerator,
  PlatformAdapter,
  type Platform,
  type ContentType,
} from '@/services/ai';
import { Automation, Content } from '@prisma/client';

/**
 * Action types supported by the automation system
 */
export type ActionType =
  | 'generate_content'
  | 'publish'
  | 'schedule'
  | 'notify'
  | 'adapt_content';

/**
 * Action configuration interface
 */
export interface AutomationAction {
  type: ActionType;
  config: Record<string, any>;
  onError?: 'continue' | 'stop';
}

/**
 * Execution result interface
 */
export interface ExecutionResult {
  logId: string;
  status: 'success' | 'failed' | 'partial';
  actionsExecuted: number;
  errors?: string[];
  results?: any[];
}

/**
 * Action execution result
 */
interface ActionResult {
  action: string;
  status: 'success' | 'failed';
  result?: any;
  error?: string;
}

/**
 * AutomationExecutor class
 * Executes automation actions based on triggers
 */
export class AutomationExecutor {
  private claudeClient: ClaudeClient | null = null;
  private contentGenerator: ContentGenerator | null = null;
  private platformAdapter: PlatformAdapter | null = null;

  constructor() {
    // Initialize AI services if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.claudeClient = new ClaudeClient(apiKey);
      this.contentGenerator = new ContentGenerator(this.claudeClient);
      this.platformAdapter = new PlatformAdapter(this.claudeClient);
    }
  }

  /**
   * Execute an automation
   * @param automation Automation to execute
   * @param triggerData Data from the trigger event
   * @returns Execution result with log ID
   */
  async executeAutomation(
    automation: Automation,
    triggerData: any
  ): Promise<ExecutionResult> {
    const startTime = new Date();
    const actionResults: ActionResult[] = [];
    const errors: string[] = [];

    // Create automation log
    const log = await prisma.automationLog.create({
      data: {
        automationId: automation.id,
        eventId: triggerData.eventId || null,
        status: 'success',
        startedAt: startTime,
        triggerData,
      },
    });

    try {
      const actions = automation.actions as any as AutomationAction[];

      // Execute each action in sequence
      for (const action of actions) {
        try {
          const result = await this.executeAction(
            action,
            triggerData,
            automation.productId
          );

          actionResults.push({
            action: action.type,
            status: 'success',
            result,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          actionResults.push({
            action: action.type,
            status: 'failed',
            error: errorMessage,
          });

          errors.push(`${action.type}: ${errorMessage}`);

          // Stop execution if action has onError: 'stop'
          if (action.onError === 'stop') {
            break;
          }
        }
      }

      // Determine overall status
      const successCount = actionResults.filter(
        (r) => r.status === 'success'
      ).length;
      const totalCount = actionResults.length;

      let status: 'success' | 'failed' | 'partial' = 'success';
      if (successCount === 0) {
        status = 'failed';
      } else if (successCount < totalCount) {
        status = 'partial';
      }

      // Update log with results
      await prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status,
          completedAt: new Date(),
          actionsExecuted: actionResults,
          errorMessage: errors.length > 0 ? errors.join('\n') : null,
        },
      });

      return {
        logId: log.id,
        status,
        actionsExecuted: successCount,
        errors: errors.length > 0 ? errors : undefined,
        results: actionResults,
      };
    } catch (error) {
      // Update log with error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage,
          actionsExecuted: actionResults,
        },
      });

      return {
        logId: log.id,
        status: 'failed',
        actionsExecuted: 0,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Execute a single action
   * @private
   */
  private async executeAction(
    action: AutomationAction,
    triggerData: any,
    productId: string
  ): Promise<any> {
    switch (action.type) {
      case 'generate_content':
        return await this.executeGenerateContent(
          action.config,
          triggerData,
          productId
        );

      case 'publish':
        return await this.executePublish(
          action.config,
          triggerData,
          productId
        );

      case 'schedule':
        return await this.executeSchedule(
          action.config,
          triggerData,
          productId
        );

      case 'notify':
        return await this.executeNotify(action.config, triggerData, productId);

      case 'adapt_content':
        return await this.executeAdaptContent(
          action.config,
          triggerData,
          productId
        );

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Execute generate_content action
   * @private
   */
  private async executeGenerateContent(
    config: any,
    triggerData: any,
    productId: string
  ): Promise<any> {
    if (!this.contentGenerator) {
      throw new Error('Content generator not initialized (missing API key)');
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    // Extract parameters from config and trigger data
    const platform = config.platform || triggerData.platform || 'twitter';
    const topic =
      config.topic ||
      triggerData.topic ||
      triggerData.subject ||
      'Product update';
    const contentType =
      config.contentType || triggerData.contentType || 'post';
    const keywords = config.keywords || triggerData.keywords || [];
    const length = config.length || 'medium';

    // Prepare product context
    const productContext = {
      name: product.name,
      description: product.description || '',
      targetAudience: 'General audience',
      uniqueValue: 'Innovative solution',
    };

    // Extract brand voice
    const brandVoice = product.brandVoice
      ? (product.brandVoice as any)
      : undefined;

    // Generate content
    const generatedPost = await this.contentGenerator.generatePost({
      product: productContext,
      brandVoice,
      platform: platform as Platform,
      contentType: contentType as ContentType,
      topic,
      keywords,
      length,
    });

    // Build adapted content
    const adapted = {
      [platform]: {
        content: generatedPost.content,
        hashtags: generatedPost.hashtags,
        characterCount: generatedPost.characterCount,
      },
    };

    // Create AI predictions object
    const predictions = {
      platform,
      isValid: generatedPost.isValid,
      characterCount: generatedPost.characterCount,
      suggestions: generatedPost.suggestions || [],
      generatedAt: new Date().toISOString(),
    };

    // Save content to database
    const content = await prisma.content.create({
      data: {
        productId,
        originalText: generatedPost.content,
        adapted,
        contentType,
        aiGenerated: true,
        aiPrompt: `Automation: Topic: ${topic}, Platform: ${platform}, Keywords: ${keywords.join(', ')}`,
        aiModel: 'claude-3-sonnet',
        predictions,
        status: config.autoPublish ? 'ready' : 'draft',
      },
    });

    return {
      contentId: content.id,
      text: generatedPost.content,
      platform,
      status: content.status,
    };
  }

  /**
   * Execute publish action
   * @private
   */
  private async executePublish(
    config: any,
    triggerData: any,
    productId: string
  ): Promise<any> {
    const contentId =
      config.contentId || triggerData.contentId || triggerData.content_id;

    if (!contentId) {
      throw new Error('contentId is required for publish action');
    }

    // Get content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.productId !== productId) {
      throw new Error('Content does not belong to this product');
    }

    // Get channels to publish to
    const channelIds = config.channelIds || config.channels || [];

    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      throw new Error('At least one channel is required for publish action');
    }

    // Verify channels exist and belong to the product
    const channels = await prisma.channel.findMany({
      where: {
        id: { in: channelIds },
        productId,
        status: 'active',
      },
    });

    if (channels.length === 0) {
      throw new Error('No valid active channels found');
    }

    // Create publications
    const publications = await Promise.all(
      channels.map((channel) =>
        prisma.publication.create({
          data: {
            contentId: content.id,
            channelId: channel.id,
            status: 'scheduled',
            scheduledAt: new Date(),
          },
        })
      )
    );

    return {
      contentId: content.id,
      publications: publications.map((p) => ({
        id: p.id,
        channelId: p.channelId,
        status: p.status,
      })),
      message: `Created ${publications.length} publication(s)`,
    };
  }

  /**
   * Execute schedule action
   * @private
   */
  private async executeSchedule(
    config: any,
    triggerData: any,
    productId: string
  ): Promise<any> {
    const contentId =
      config.contentId || triggerData.contentId || triggerData.content_id;

    if (!contentId) {
      throw new Error('contentId is required for schedule action');
    }

    // Get content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.productId !== productId) {
      throw new Error('Content does not belong to this product');
    }

    // Get channels to schedule to
    const channelIds = config.channelIds || config.channels || [];

    if (!Array.isArray(channelIds) || channelIds.length === 0) {
      throw new Error('At least one channel is required for schedule action');
    }

    // Determine scheduled time
    let scheduledAt: Date;

    if (config.scheduledAt) {
      scheduledAt = new Date(config.scheduledAt);
    } else if (config.delayMinutes) {
      scheduledAt = new Date(Date.now() + config.delayMinutes * 60 * 1000);
    } else {
      // Default to 1 hour from now
      scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
    }

    // Verify channels exist and belong to the product
    const channels = await prisma.channel.findMany({
      where: {
        id: { in: channelIds },
        productId,
        status: 'active',
      },
    });

    if (channels.length === 0) {
      throw new Error('No valid active channels found');
    }

    // Create scheduled publications
    const publications = await Promise.all(
      channels.map((channel) =>
        prisma.publication.create({
          data: {
            contentId: content.id,
            channelId: channel.id,
            status: 'scheduled',
            scheduledAt,
          },
        })
      )
    );

    return {
      contentId: content.id,
      scheduledAt: scheduledAt.toISOString(),
      publications: publications.map((p) => ({
        id: p.id,
        channelId: p.channelId,
        scheduledAt: p.scheduledAt?.toISOString(),
      })),
      message: `Scheduled ${publications.length} publication(s) for ${scheduledAt.toISOString()}`,
    };
  }

  /**
   * Execute notify action
   * @private
   */
  private async executeNotify(
    config: any,
    triggerData: any,
    productId: string
  ): Promise<any> {
    const message =
      config.message ||
      triggerData.message ||
      'Automation executed successfully';

    const recipients = config.recipients || config.to || [];
    const channel = config.channel || 'email';

    // Log notification (in production, this would send actual notifications)
    console.log('Notification:', {
      productId,
      channel,
      recipients,
      message,
      triggerData,
    });

    return {
      channel,
      recipients,
      message,
      sent: true,
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Execute adapt_content action
   * @private
   */
  private async executeAdaptContent(
    config: any,
    triggerData: any,
    productId: string
  ): Promise<any> {
    if (!this.platformAdapter) {
      throw new Error('Platform adapter not initialized (missing API key)');
    }

    const contentId =
      config.contentId || triggerData.contentId || triggerData.content_id;

    if (!contentId) {
      throw new Error('contentId is required for adapt_content action');
    }

    // Get content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.productId !== productId) {
      throw new Error('Content does not belong to this product');
    }

    const targetPlatforms =
      config.platforms || config.targetPlatforms || ['twitter', 'linkedin'];

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      throw new Error('At least one target platform is required');
    }

    // Adapt content for each platform
    const adaptations: Record<string, any> = {};

    for (const platform of targetPlatforms) {
      try {
        const adaptedContent = await this.platformAdapter.adaptToPlatform(
          content.originalText,
          platform as Platform
        );

        adaptations[platform] = {
          content: adaptedContent.adaptedContent,
          characterCount: adaptedContent.characterCount,
          isValid: adaptedContent.isValid,
        };
      } catch (error) {
        console.error(`Error adapting to ${platform}:`, error);
        adaptations[platform] = {
          error: error instanceof Error ? error.message : 'Adaptation failed',
        };
      }
    }

    // Update content with adaptations
    const existingAdapted = (content.adapted || {}) as any;
    const updatedAdapted = {
      ...existingAdapted,
      ...adaptations,
    };

    await prisma.content.update({
      where: { id: contentId },
      data: {
        adapted: updatedAdapted,
      },
    });

    return {
      contentId: content.id,
      platforms: targetPlatforms,
      adaptations,
      message: `Content adapted for ${targetPlatforms.length} platform(s)`,
    };
  }
}
