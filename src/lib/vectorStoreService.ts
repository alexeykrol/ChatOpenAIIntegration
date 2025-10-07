import OpenAI from 'openai';

export interface VectorStoreResponse {
  id: string;
  name: string;
  file_counts: {
    in_progress: number;
    completed: number;
    failed: number;
    cancelled: number;
    total: number;
  };
  status: string;
  created_at: number;
}

export interface VectorStoreFileResponse {
  id: string;
  vector_store_id: string;
  status: string;
  created_at: number;
  usage_bytes: number;
  chunking_strategy?: {
    type: string;
    static?: {
      max_chunk_size_tokens: number;
      chunk_overlap_tokens: number;
    };
  };
}

export interface FileUploadResult {
  file_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

export interface SearchResult {
  search_query: string;
  data: Array<{
    file_id: string;
    filename: string;
    score: number;
    content: Array<{
      type: string;
      text: string;
    }>;
    attributes?: Record<string, any>;
  }>;
  has_more: boolean;
  next_page?: string;
}

/**
 * Independent Vector Store Management Service
 * Handles file uploads, vectorization, and semantic search
 * Does NOT handle assistant management
 */
export class VectorStoreService {
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
   * Create a new Vector Store
   */
  async createVectorStore(name: string, fileIds?: string[]): Promise<VectorStoreResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const vectorStore = await this.openai.vectorStores.create({
        name,
        file_ids: fileIds
      });

      return {
        id: vectorStore.id,
        name: vectorStore.name || '',
        file_counts: vectorStore.file_counts,
        status: vectorStore.status,
        created_at: vectorStore.created_at
      };
    } catch (error) {
      throw new Error(`Failed to create vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload file and add to Vector Store (with vectorization)
   */
  async uploadFileToVectorStore(vectorStoreId: string, file: File): Promise<FileUploadResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      // Upload file and add to vector store with polling (handles vectorization)
      const result = await this.openai.vectorStores.files.uploadAndPoll(vectorStoreId, file);

      console.log(`File ${file.name} uploaded and vectorized in vector store ${vectorStoreId}`);

      return {
        file_id: result.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type
      };
    } catch (error) {
      throw new Error(`Failed to upload file to vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple files to Vector Store
   */
  async uploadFilesToVectorStore(vectorStoreId: string, files: File[]): Promise<FileUploadResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const results: FileUploadResult[] = [];
      
      // Process files in batches (up to 500 per OpenAI documentation)
      const batchSize = 500;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        
        for (const file of batch) {
          const result = await this.uploadFileToVectorStore(vectorStoreId, file);
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to upload files to vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete file from Vector Store
   */
  async deleteFileFromVectorStore(vectorStoreId: string, fileId: string): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      await this.openai.vectorStores.files.delete(vectorStoreId, fileId);
      console.log(`File ${fileId} removed from vector store ${vectorStoreId}`);
    } catch (error) {
      throw new Error(`Failed to delete file from vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List files in Vector Store
   */
  async listVectorStoreFiles(vectorStoreId: string): Promise<VectorStoreFileResponse[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const files = await this.openai.vectorStores.files.list(vectorStoreId);
      return files.data.map(file => ({
        id: file.id,
        vector_store_id: file.vector_store_id,
        status: file.status,
        created_at: file.created_at,
        usage_bytes: file.usage_bytes || 0,
        chunking_strategy: file.chunking_strategy
      }));
    } catch (error) {
      throw new Error(`Failed to list vector store files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform semantic search in Vector Store
   * Note: Direct vector store search is not available in current OpenAI SDK
   * This functionality is typically used through Assistant's file_search tool
   */
  async searchVectorStore(
    vectorStoreId: string, 
    query: string, 
    options?: {
      max_num_results?: number;
      rewrite_query?: boolean;
      attribute_filter?: any;
      ranking_options?: {
        ranker?: string;
        score_threshold?: number;
      };
    }
  ): Promise<SearchResult> {
    // For now, return empty results - this functionality is handled by Assistant file_search
    console.warn('Direct vector store search not implemented - use Assistant file_search tool instead');
    
    return {
      search_query: query,
      data: [],
      has_more: false,
      next_page: undefined
    };
  }

  /**
   * Get Vector Store information
   */
  async getVectorStore(vectorStoreId: string): Promise<VectorStoreResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const vectorStore = await this.openai.vectorStores.retrieve(vectorStoreId);
      
      return {
        id: vectorStore.id,
        name: vectorStore.name || '',
        file_counts: vectorStore.file_counts,
        status: vectorStore.status,
        created_at: vectorStore.created_at
      };
    } catch (error) {
      throw new Error(`Failed to get vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete Vector Store (and all its files)
   */
  async deleteVectorStore(vectorStoreId: string): Promise<void> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      await this.openai.vectorStores.delete(vectorStoreId);
      console.log(`Vector store ${vectorStoreId} deleted`);
    } catch (error) {
      throw new Error(`Failed to delete vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update Vector Store
   */
  async updateVectorStore(vectorStoreId: string, updates: { name?: string; expires_after?: any }): Promise<VectorStoreResponse> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not properly set or is invalid. Please check your API key in settings.');
    }

    try {
      const vectorStore = await this.openai.vectorStores.update(vectorStoreId, updates);
      
      return {
        id: vectorStore.id,
        name: vectorStore.name || '',
        file_counts: vectorStore.file_counts,
        status: vectorStore.status,
        created_at: vectorStore.created_at
      };
    } catch (error) {
      throw new Error(`Failed to update vector store: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}