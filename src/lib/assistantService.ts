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

function transliterate(text: string): string {
  return text.split('').map(char => transliterationMap[char] || char).join('');
}

export interface AssistantConfig {
  name: string;
  instructions: string;
  model: string;
  tools?: Array<{ type: 'file_search' }>;
  tool_resources?: {
    file_search?: {
      vector_store_ids?: string[];
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

/**
 * Independent Assistant Management Service
 * Handles only OpenAI Assistant creation, updates, and deletion
 * Does NOT handle file management or vector stores
 */
export class AssistantService {
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

  /**
   * Create a new Assistant (pure assistant management, no files)
   */
  async createAssistant(config: AssistantConfig): Promise<AssistantResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const transliteratedName = transliterate(config.name);
      console.log('Creating assistant:', config.name, '->', transliteratedName, 'model:', config.model || 'gpt-4');
      
      const assistant = await this.openai.beta.assistants.create({
        name: transliteratedName,
        instructions: config.instructions,
        model: config.model || 'gpt-4',
        tools: config.tools || [],
        tool_resources: config.tool_resources
      });

      console.log('Assistant created successfully:', assistant.id);
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
      
      const assistant = await this.openai.beta.assistants.update(assistantId, updateData);

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
      console.log('Assistant deleted:', assistantId);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI Assistants API Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Link Vector Store to Assistant
   * This is the integration point between modules
   */
  async linkVectorStore(assistantId: string, vectorStoreIds: string[]): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      await this.openai.beta.assistants.update(assistantId, {
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: vectorStoreIds
          }
        }
      });
      console.log(`Vector stores ${vectorStoreIds.join(', ')} linked to assistant ${assistantId}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to link vector store: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Unlink Vector Store from Assistant
   */
  async unlinkVectorStore(assistantId: string): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      await this.openai.beta.assistants.update(assistantId, {
        tools: [],
        tool_resources: {}
      });
      console.log(`Vector stores unlinked from assistant ${assistantId}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to unlink vector store: ${error.message}`);
      }
      throw error;
    }
  }
}