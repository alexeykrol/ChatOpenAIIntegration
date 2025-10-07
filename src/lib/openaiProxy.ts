/**
 * OpenAI Proxy Client - Secure Backend Integration
 *
 * This client calls Supabase Edge Functions instead of OpenAI directly.
 * Benefits:
 * - API keys never exposed to browser
 * - Rate limiting enforced server-side
 * - User authentication required
 * - Centralized logging and monitoring
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: Message[];
  model?: string;
  temperature?: number;
  stream?: boolean;
}

export interface AssistantOptions {
  name: string;
  instructions: string;
  model?: string;
  tools?: any[];
  file_ids?: string[];
}

/**
 * OpenAI Proxy Service
 * All methods call Supabase Edge Functions instead of OpenAI directly
 */
export class OpenAIProxyService {
  private functionsUrl: string;

  constructor() {
    this.functionsUrl = `${supabaseUrl}/functions/v1`;
  }

  /**
   * Get authentication token for Edge Function requests
   */
  private async getAuthToken(): Promise<string> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error('Not authenticated. Please sign in.');
    }

    return session.access_token;
  }

  /**
   * Call Supabase Edge Function with authentication
   */
  private async callFunction(
    functionName: string,
    payload: any,
    options: { stream?: boolean } = {}
  ): Promise<Response> {
    const token = await this.getAuthToken();

    const response = await fetch(`${this.functionsUrl}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // Check for rate limiting
    if (response.status === 429) {
      const data = await response.json();
      throw new Error(
        `Rate limit exceeded. Please wait until ${new Date(data.resetAt).toLocaleTimeString()}`
      );
    }

    if (!response.ok && !options.stream) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response;
  }

  /**
   * Stream chat completion (for real-time responses)
   */
  async *streamChat(options: ChatCompletionOptions): AsyncGenerator<string> {
    const response = await this.callFunction(
      'openai-chat',
      {
        ...options,
        stream: true,
      },
      { stream: true }
    );

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;

              if (content) {
                yield content;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get chat completion (non-streaming)
   */
  async createChatCompletion(options: ChatCompletionOptions): Promise<string> {
    const response = await this.callFunction('openai-chat', {
      ...options,
      stream: false,
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Create OpenAI Assistant
   */
  async createAssistant(options: AssistantOptions): Promise<any> {
    const response = await this.callFunction('openai-assistants', {
      action: 'create_assistant',
      payload: {
        name: options.name,
        instructions: options.instructions,
        model: options.model || 'gpt-4',
        tools: options.tools || [],
        file_ids: options.file_ids || [],
      },
    });

    return await response.json();
  }

  /**
   * Update OpenAI Assistant
   */
  async updateAssistant(assistantId: string, options: Partial<AssistantOptions>): Promise<any> {
    const response = await this.callFunction('openai-assistants', {
      action: 'update_assistant',
      payload: {
        assistant_id: assistantId,
        data: options,
      },
    });

    return await response.json();
  }

  /**
   * Delete OpenAI Assistant
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    await this.callFunction('openai-assistants', {
      action: 'delete_assistant',
      payload: { assistant_id: assistantId },
    });
  }

  /**
   * Create Thread
   */
  async createThread(): Promise<any> {
    const response = await this.callFunction('openai-assistants', {
      action: 'create_thread',
      payload: {},
    });

    return await response.json();
  }

  /**
   * Add message to thread
   */
  async addMessage(threadId: string, content: string): Promise<any> {
    const response = await this.callFunction('openai-assistants', {
      action: 'add_message',
      payload: {
        thread_id: threadId,
        content,
      },
    });

    return await response.json();
  }

  /**
   * Run assistant on thread
   */
  async runAssistant(threadId: string, assistantId: string): Promise<any> {
    const response = await this.callFunction('openai-assistants', {
      action: 'run_assistant',
      payload: {
        thread_id: threadId,
        assistant_id: assistantId,
      },
    });

    return await response.json();
  }

  /**
   * Get run status
   */
  async getRun(threadId: string, runId: string): Promise<any> {
    const response = await this.callFunction('openai-assistants', {
      action: 'get_run',
      payload: {
        thread_id: threadId,
        run_id: runId,
      },
    });

    return await response.json();
  }

  /**
   * List messages in thread
   */
  async listMessages(threadId: string): Promise<any> {
    const response = await this.callFunction('openai-assistants', {
      action: 'list_messages',
      payload: {
        thread_id: threadId,
      },
    });

    return await response.json();
  }

  /**
   * Upload file to OpenAI
   */
  async uploadFile(file: File): Promise<any> {
    const token = await this.getAuthToken();

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.functionsUrl}/openai-assistants`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'upload_file',
        payload: {
          file: file.name, // Edge function will handle the actual file
        },
      }),
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    return await response.json();
  }

  /**
   * Delete file from OpenAI
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.callFunction('openai-assistants', {
      action: 'delete_file',
      payload: {
        file_id: fileId,
      },
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  }

  /**
   * Get current rate limit status (from response headers)
   */
  getRateLimitFromResponse(response: Response): {
    limit: number;
    remaining: number;
    reset: string;
  } | null {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining) {
      return {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        reset: reset || 'Unknown',
      };
    }

    return null;
  }
}

// Export singleton instance
export const openaiProxy = new OpenAIProxyService();

// Export for backward compatibility
export default openaiProxy;
