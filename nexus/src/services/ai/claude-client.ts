import Anthropic from '@anthropic-ai/sdk';

/**
 * Custom error class for AI-related errors
 */
export class AIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AIError';
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

/**
 * Options for generating content
 */
export interface GenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Result of content generation
 */
export interface GenerationResult {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason: string;
}

/**
 * Default configuration for Claude API
 */
const DEFAULT_CONFIG = {
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 0.7,
} as const;

/**
 * Claude API client for generating content
 */
export class ClaudeClient {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  /**
   * Creates a new ClaudeClient instance
   * @param apiKey - Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
   * @param config - Default configuration overrides
   */
  constructor(
    apiKey?: string,
    config?: Partial<typeof DEFAULT_CONFIG>
  ) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;

    if (!key) {
      throw new AIError(
        'ANTHROPIC_API_KEY is required. Provide it as a parameter or set the ANTHROPIC_API_KEY environment variable.',
        'MISSING_API_KEY'
      );
    }

    try {
      this.client = new Anthropic({ apiKey: key });
    } catch (error) {
      throw new AIError(
        'Failed to initialize Anthropic client',
        'INITIALIZATION_ERROR',
        undefined,
        error
      );
    }

    this.defaultModel = config?.model || DEFAULT_CONFIG.model;
    this.defaultMaxTokens = config?.maxTokens || DEFAULT_CONFIG.maxTokens;
    this.defaultTemperature = config?.temperature || DEFAULT_CONFIG.temperature;
  }

  /**
   * Generates content from a simple prompt
   * @param prompt - The user prompt
   * @param options - Generation options
   * @returns Generation result
   */
  async generateContent(
    prompt: string,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    if (!prompt || prompt.trim().length === 0) {
      throw new AIError(
        'Prompt cannot be empty',
        'INVALID_PROMPT'
      );
    }

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const stream = options?.stream || false;

    try {
      if (stream) {
        return await this.generateStreaming(prompt, model, maxTokens, temperature);
      } else {
        return await this.generateNonStreaming(prompt, model, maxTokens, temperature);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Generates content with a system prompt and user prompt
   * @param systemPrompt - The system prompt
   * @param userPrompt - The user prompt
   * @param options - Generation options
   * @returns Generation result
   */
  async generateWithSystem(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions
  ): Promise<GenerationResult> {
    if (!systemPrompt || systemPrompt.trim().length === 0) {
      throw new AIError(
        'System prompt cannot be empty',
        'INVALID_SYSTEM_PROMPT'
      );
    }

    if (!userPrompt || userPrompt.trim().length === 0) {
      throw new AIError(
        'User prompt cannot be empty',
        'INVALID_USER_PROMPT'
      );
    }

    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.defaultMaxTokens;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const stream = options?.stream || false;

    try {
      if (stream) {
        return await this.generateStreamingWithSystem(
          systemPrompt,
          userPrompt,
          model,
          maxTokens,
          temperature
        );
      } else {
        return await this.generateNonStreamingWithSystem(
          systemPrompt,
          userPrompt,
          model,
          maxTokens,
          temperature
        );
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Generates content without streaming (simple prompt)
   */
  private async generateNonStreaming(
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerationResult> {
    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return this.formatResponse(response);
  }

  /**
   * Generates content without streaming (with system prompt)
   */
  private async generateNonStreamingWithSystem(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerationResult> {
    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    return this.formatResponse(response);
  }

  /**
   * Generates content with streaming (simple prompt)
   */
  private async generateStreaming(
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerationResult> {
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0 };
    let stopReason = '';
    let usedModel = model;

    const stream = await this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullContent += event.delta.text;
        }
      } else if (event.type === 'message_start') {
        usedModel = event.message.model;
        usage.inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        usage.outputTokens = event.usage.output_tokens;
        stopReason = event.delta.stop_reason || '';
      }
    }

    return {
      content: fullContent,
      model: usedModel,
      usage,
      stopReason,
    };
  }

  /**
   * Generates content with streaming (with system prompt)
   */
  private async generateStreamingWithSystem(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<GenerationResult> {
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0 };
    let stopReason = '';
    let usedModel = model;

    const stream = await this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          fullContent += event.delta.text;
        }
      } else if (event.type === 'message_start') {
        usedModel = event.message.model;
        usage.inputTokens = event.message.usage.input_tokens;
      } else if (event.type === 'message_delta') {
        usage.outputTokens = event.usage.output_tokens;
        stopReason = event.delta.stop_reason || '';
      }
    }

    return {
      content: fullContent,
      model: usedModel,
      usage,
      stopReason,
    };
  }

  /**
   * Formats the API response to GenerationResult
   */
  private formatResponse(response: Anthropic.Message): GenerationResult {
    const textContent = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.TextBlock).text)
      .join('');

    return {
      content: textContent,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      stopReason: response.stop_reason || 'unknown',
    };
  }

  /**
   * Handles errors from the API
   */
  private handleError(error: unknown): never {
    if (error instanceof Anthropic.APIError) {
      throw new AIError(
        `Claude API Error: ${error.message}`,
        error.type || 'API_ERROR',
        error.status,
        error
      );
    }

    if (error instanceof AIError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new AIError(
        `Unexpected error: ${error.message}`,
        'UNKNOWN_ERROR',
        undefined,
        error
      );
    }

    throw new AIError(
      'An unknown error occurred',
      'UNKNOWN_ERROR',
      undefined,
      error
    );
  }

  /**
   * Gets the default model being used
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Gets the default max tokens being used
   */
  getDefaultMaxTokens(): number {
    return this.defaultMaxTokens;
  }

  /**
   * Gets the default temperature being used
   */
  getDefaultTemperature(): number {
    return this.defaultTemperature;
  }
}
