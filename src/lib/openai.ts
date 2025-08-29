import OpenAI from 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ModelSettings {
  model: string;
  temperature: number;
  max_tokens: number;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
export class OpenAIService {
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(apiKey: string) {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      this.openai = null;
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: trimmedKey,
        dangerouslyAllowBrowser: true
      });
    } catch (error) {
      this.openai = null;
    }
  }

  async *streamChat(
    messages: ChatMessage[],
    settings: ModelSettings,
    onAbort?: () => void
  ): AsyncGenerator<{ content: string; usage?: TokenUsage }, void, unknown> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const stream = await this.openai.chat.completions.create({
        model: settings.model,
        messages,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      let usage: TokenUsage | undefined;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        
        // Capture usage information when available
        if (chunk.usage) {
          usage = {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens
          };
        }
        
        if (content) {
          yield { content, usage };
        }
      }
      
      // Yield final usage if we have it
      if (usage) {
        yield { content: '', usage };
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      await testClient.models.list();
      return true;
    } catch {
      return false;
    }
  }
}