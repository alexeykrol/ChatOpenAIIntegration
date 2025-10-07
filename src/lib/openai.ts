import OpenAI from 'openai';

// Transliteration mapping for Russian to Latin
const transliterationMap: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
  'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
  'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
  'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
  'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
};

// Transliterate text from Cyrillic to Latin
function transliterate(text: string): string {
  return text.split('').map(char => transliterationMap[char] || char).join('');
}

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

export interface EmbeddingResponse {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Assistants API interfaces
export interface AssistantConfig {
  name: string;
  instructions: string;
  model: string;
  tools?: Array<{ type: 'file_search' }>;
  tool_resources?: {
    file_search?: {
      vector_store_ids?: string[];
    };
    code_interpreter?: {
      file_ids?: string[];
    };
  };
}

export interface AssistantResponse {
  id: string;
  name: string;
  instructions: string;
  model: string;
  tools: any[];
}

export interface ThreadResponse {
  id: string;
}

export interface RunResponse {
  id: string;
  status: string; // OpenAI's RunStatus type includes more values
  run?: any; // Full run object for debugging
  usage?: TokenUsage; // Token usage from run
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

  async createEmbedding(text: string, model: string = 'text-embedding-3-small'): Promise<EmbeddingResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const response = await this.openai.embeddings.create({
        model,
        input: text,
        encoding_format: 'float'
      });

      return {
        embedding: response.data[0].embedding,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          total_tokens: response.usage.total_tokens
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI Embeddings API Error: ${error.message}`);
      }
      throw error;
    }
  }

  async createEmbeddings(texts: string[], model: string = 'text-embedding-3-small'): Promise<EmbeddingResponse[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const response = await this.openai.embeddings.create({
        model,
        input: texts,
        encoding_format: 'float'
      });

      return response.data.map((item) => ({
        embedding: item.embedding,
        usage: {
          prompt_tokens: Math.floor(response.usage.prompt_tokens / texts.length),
          total_tokens: Math.floor(response.usage.total_tokens / texts.length)
        }
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI Embeddings API Error: ${error.message}`);
      }
      throw error;
    }
  }

  // ===== ASSISTANTS API METHODS =====

  /**
   * Create a new Assistant
   */
  async createAssistant(config: AssistantConfig): Promise<AssistantResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const transliteratedName = transliterate(config.name);
      console.log('Creating assistant:', config.name, '->', transliteratedName, 'model:', config.model || 'gpt-4', 'tools:', config.tools?.length || 0);
      const assistant = await this.openai.beta.assistants.create({
        name: transliteratedName,
        instructions: config.instructions,
        model: config.model || 'gpt-4',
        tools: config.tools || [{ type: 'file_search' }]
      });

      console.log('Assistant created successfully:', assistant.id, 'tools:', assistant.tools.length);
      return {
        id: assistant.id,
        name: assistant.name || '',
        instructions: assistant.instructions || '',
        model: assistant.model,
        tools: assistant.tools
      };
    } catch (error) {
      console.error('Error creating assistant:', error);
      if (error instanceof Error) {
        throw new Error(`OpenAI Assistants API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing Assistant
   */
  async updateAssistant(assistantId: string, updates: Partial<AssistantConfig>): Promise<AssistantResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const updateData = { ...updates };
      if (updates.name) {
        updateData.name = transliterate(updates.name);
        console.log('Updating assistant name:', updates.name, '->', updateData.name);
      }
      const assistant = await this.openai.beta.assistants.update(assistantId, {
        ...updateData,
        tools: updates.tools || [{ type: 'file_search' }]
      });

      return {
        id: assistant.id,
        name: assistant.name || '',
        instructions: assistant.instructions || '',
        model: assistant.model,
        tools: assistant.tools
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI Assistants API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Delete an Assistant
   */
  async deleteAssistant(assistantId: string): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      await this.openai.beta.assistants.delete(assistantId);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI Assistants API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Upload a file for use with Assistants
   */
  async uploadFile(file: File): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const uploadedFile = await this.openai.files.create({
        file: file,
        purpose: 'assistants'
      });

      return uploadedFile.id;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI File Upload API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create a new Thread
   */
  async createThread(): Promise<ThreadResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const thread = await this.openai.beta.threads.create();
      return { id: thread.id };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI Threads API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Add a message to a Thread
   */
  async addMessage(threadId: string, content: string): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      await this.openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content
      });
    } catch (error) {
      console.error('Error adding message:', error);
      if (error instanceof Error) {
        throw new Error(`OpenAI Messages API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Run an Assistant on a Thread
   */
  async runAssistant(threadId: string, assistantId: string): Promise<RunResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const run = await this.openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId
      });
      return {
        id: run.id,
        status: run.status
      };
    } catch (error) {
      console.error('Error creating run:', error);
      if (error instanceof Error) {
        throw new Error(`OpenAI Runs API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Upload file to OpenAI and add to Vector Store for assistant
   */
  async uploadFileToOpenAI(file: File, assistantId?: string): Promise<{ file_id: string; file_name: string; file_size: number; file_type: string; vector_store_id?: string }> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      // Step 1: Upload file to OpenAI Files API
      const uploadedFile = await this.openai.files.create({
        file: file,
        purpose: 'assistants'
      });

      let vectorStoreId: string | undefined;

      // Step 2: If assistantId provided, create Vector Store and add file
      if (assistantId) {
        // Create Vector Store for this assistant
        const vectorStore = await this.openai.vectorStores.create({
          name: `Assistant ${assistantId} Knowledge Base`
        });
        vectorStoreId = vectorStore.id;

        // Upload file to Vector Store with polling (handles vectorization)
        await this.openai.vectorStores.fileBatches.uploadAndPoll(vectorStoreId, {
          files: [file]
        });

        // Link Vector Store to Assistant
        await this.openai.beta.assistants.update(assistantId, {
          tools: [{ type: 'file_search' }],
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStoreId]
            }
          }
        });

        console.log(`File ${uploadedFile.id} uploaded and vectorized in store ${vectorStoreId} for assistant ${assistantId}`);
      }

      return {
        file_id: uploadedFile.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        vector_store_id: vectorStoreId
      };
    } catch (error) {
      throw new Error(`Failed to upload file to OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from OpenAI Files API and Vector Store
   */
  async deleteFileFromOpenAI(fileId: string, vectorStoreId?: string): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      // Remove from Vector Store first if provided
      if (vectorStoreId) {
        try {
          await this.openai.vectorStores.files.del(vectorStoreId, fileId);
          console.log(`File ${fileId} removed from vector store ${vectorStoreId}`);
        } catch (error) {
          console.warn(`Failed to remove file from vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Delete the actual file
      await this.openai.files.delete(fileId);
      console.log(`File ${fileId} deleted from OpenAI`);
    } catch (error) {
      throw new Error(`Failed to delete file from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all files from OpenAI Files API
   */
  async listFiles(): Promise<any[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const filesList = await this.openai.files.list({
        purpose: 'assistants'
      });
      return filesList.data;
    } catch (error) {
      throw new Error(`Failed to list files from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check the status of a Run
   */
  async checkRun(threadId: string, runId: string): Promise<RunResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const run = await this.openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
      // Log status changes will be handled in the polling loop
      
      // Log only if there are issues
      if (run.status === 'failed') {
        console.error('Run failed:', run.last_error);
      }
      if (run.status === 'requires_action') {
        console.warn('Run requires action:', run.required_action);
      }

      return {
        id: run.id,
        status: run.status,
        run: run,
        usage: run.usage || undefined
      };
    } catch (error) {
      console.error('Error checking run:', error);
      if (error instanceof Error) {
        throw new Error(`OpenAI Runs API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get messages from a Thread (for streaming-like experience)
   */
  async getThreadMessages(threadId: string): Promise<Array<{ role: string; content: string }>> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const messages = await this.openai.beta.threads.messages.list(threadId);
      return messages.data.map(msg => ({
        role: msg.role,
        content: typeof msg.content[0] === 'object' && 'text' in msg.content[0] 
          ? msg.content[0].text.value 
          : ''
      })).reverse(); // Reverse to get chronological order
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI Messages API Error: ${error.message}`);
      }
      throw error;
    }
  }
}