import { AssistantService, AssistantConfig } from './assistantService';
import { VectorStoreService } from './vectorStoreService';

export interface PersonalityWithFiles {
  personality: {
    id: string;
    name: string;
    prompt: string;
    has_memory: boolean;
    file_instruction?: string;
    openai_assistant_id?: string;
  };
  vector_store_id?: string;
  files: Array<{
    file_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
  }>;
}

/**
 * Integration Service
 * Coordinates between Assistant and Vector Store services
 * Provides high-level operations that combine both modules
 */
export class IntegrationService {
  private assistantService: AssistantService;
  private vectorStoreService: VectorStoreService;

  constructor(apiKey?: string) {
    this.assistantService = new AssistantService(apiKey);
    this.vectorStoreService = new VectorStoreService(apiKey);
  }

  setApiKey(apiKey: string) {
    this.assistantService.setApiKey(apiKey);
    this.vectorStoreService.setApiKey(apiKey);
  }

  /**
   * Create personality with optional file uploads
   */
  async createPersonalityWithFiles(
    personalityData: {
      name: string;
      prompt: string;
      has_memory: boolean;
      file_instruction?: string;
    },
    files?: File[]
  ): Promise<PersonalityWithFiles> {
    try {
      // Step 1: Create Assistant
      const assistantConfig: AssistantConfig = {
        name: personalityData.name,
        instructions: personalityData.prompt,
        model: 'gpt-4o'
      };

      const assistant = await this.assistantService.createAssistant(assistantConfig);

      let vectorStoreId: string | undefined;
      const uploadedFiles: Array<{ file_id: string; file_name: string; file_size: number; file_type: string }> = [];

      // Step 2: If files provided, create Vector Store and upload files
      if (files && files.length > 0) {
        // Create Vector Store
        const vectorStore = await this.vectorStoreService.createVectorStore(
          `${personalityData.name} Knowledge Base`
        );
        vectorStoreId = vectorStore.id;

        // Upload files to Vector Store
        for (const file of files) {
          const uploadResult = await this.vectorStoreService.uploadFileToVectorStore(vectorStoreId, file);
          uploadedFiles.push(uploadResult);
        }

        // Link Vector Store to Assistant
        await this.assistantService.linkVectorStore(assistant.id, [vectorStoreId]);
      }

      return {
        personality: {
          id: assistant.id, // Using assistant.id as personality.id for now
          name: personalityData.name,
          prompt: personalityData.prompt,
          has_memory: personalityData.has_memory,
          file_instruction: personalityData.file_instruction,
          openai_assistant_id: assistant.id
        },
        vector_store_id: vectorStoreId,
        files: uploadedFiles
      };
    } catch (error) {
      throw new Error(`Failed to create personality with files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add files to existing personality
   */
  async addFilesToPersonality(
    assistantId: string,
    personalityName: string,
    files: File[],
    vectorStoreId?: string
  ): Promise<{
    vector_store_id: string;
    uploaded_files: Array<{ file_id: string; file_name: string; file_size: number; file_type: string }>;
  }> {
    try {
      let currentVectorStoreId = vectorStoreId;

      // Create Vector Store if it doesn't exist
      if (!currentVectorStoreId) {
        const vectorStore = await this.vectorStoreService.createVectorStore(
          `${personalityName} Knowledge Base`
        );
        currentVectorStoreId = vectorStore.id;

        // Link to Assistant
        await this.assistantService.linkVectorStore(assistantId, [currentVectorStoreId]);
      }

      // Upload files
      const uploadedFiles: Array<{ file_id: string; file_name: string; file_size: number; file_type: string }> = [];
      for (const file of files) {
        const uploadResult = await this.vectorStoreService.uploadFileToVectorStore(currentVectorStoreId, file);
        uploadedFiles.push(uploadResult);
      }

      return {
        vector_store_id: currentVectorStoreId,
        uploaded_files: uploadedFiles
      };
    } catch (error) {
      throw new Error(`Failed to add files to personality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove file from personality
   */
  async removeFileFromPersonality(
    vectorStoreId: string,
    fileId: string
  ): Promise<void> {
    try {
      await this.vectorStoreService.deleteFileFromVectorStore(vectorStoreId, fileId);
    } catch (error) {
      throw new Error(`Failed to remove file from personality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete personality and all associated files
   */
  async deletePersonalityWithFiles(
    assistantId: string,
    vectorStoreId?: string
  ): Promise<void> {
    try {
      // Delete Vector Store (this will delete all files)
      if (vectorStoreId) {
        await this.vectorStoreService.deleteVectorStore(vectorStoreId);
      }

      // Delete Assistant
      await this.assistantService.deleteAssistant(assistantId);
    } catch (error) {
      throw new Error(`Failed to delete personality with files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update personality (assistant only, files managed separately)
   */
  async updatePersonality(
    assistantId: string,
    updates: {
      name?: string;
      instructions?: string;
      model?: string;
    }
  ): Promise<void> {
    try {
      const assistantConfig: Partial<AssistantConfig> = {};
      
      if (updates.name) assistantConfig.name = updates.name;
      if (updates.instructions) assistantConfig.instructions = updates.instructions;
      if (updates.model) assistantConfig.model = updates.model;

      await this.assistantService.updateAssistant(assistantId, assistantConfig);
    } catch (error) {
      throw new Error(`Failed to update personality: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search files associated with personality
   */
  async searchPersonalityFiles(
    vectorStoreId: string,
    query: string,
    options?: {
      max_num_results?: number;
      score_threshold?: number;
    }
  ): Promise<any> {
    try {
      return await this.vectorStoreService.searchVectorStore(vectorStoreId, query, {
        max_num_results: options?.max_num_results || 10,
        ranking_options: options?.score_threshold ? {
          ranker: 'auto',
          score_threshold: options.score_threshold
        } : undefined
      });
    } catch (error) {
      throw new Error(`Failed to search personality files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get personality files info
   */
  async getPersonalityFiles(vectorStoreId: string): Promise<any[]> {
    try {
      return await this.vectorStoreService.listVectorStoreFiles(vectorStoreId);
    } catch (error) {
      throw new Error(`Failed to get personality files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Expose individual services for advanced usage
  get assistant() {
    return this.assistantService;
  }

  get vectorStore() {
    return this.vectorStoreService;
  }
}